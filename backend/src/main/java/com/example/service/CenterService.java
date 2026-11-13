package com.example.service;

import com.example.entity.Employee;
import com.example.entity.Location;
import com.example.repository.AttendanceRepository;
import com.example.repository.EmployeeRepository;
import com.example.repository.LeaveRequestRepository;
import com.example.repository.LocationRepository;
import com.example.repository.OnDutyRequestRepository;
import com.example.repository.PayslipRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Centers (Maaya World Hyderabad, Maaya World Vizag, gaming zones, ...): lookup, create, rename and delete.
 *
 * The center name is copied as text onto attendance, leave, On Duty and payslip rows, so a rename
 * rewrites those copies in the same transaction to keep reports and filters consistent.
 */
@Service
public class CenterService {

    /** Original three centers. Used to seed a fresh database and to migrate the old short names. */
    public record CenterSeed(String name, String city, String state, String address,
                             double latitude, double longitude, List<String> legacyNames) {}

    public static final List<CenterSeed> DEFAULT_CENTERS = List.of(
            new CenterSeed("Maaya World Hyderabad", "Hyderabad", "Telangana",
                    "Prism Mall, Financial District, Gachibowli", 17.4326, 78.3411,
                    List.of("Hyderabad", "Hyderabad Center")),
            new CenterSeed("Maaya World Vizag", "Visakhapatnam", "Andhra Pradesh",
                    "Beach Road, Opp. TU 142 Aircraft Museum", 17.7196, 83.3328,
                    List.of("Vizag", "Visakhapatnam", "Vizag Center")),
            new CenterSeed("Maaya World Bhubaneswar", "Bhubaneswar", "Odisha",
                    "KIIT Chowk, Patia Square", 20.3541, 85.8175,
                    List.of("Bhubaneswar", "Bhubaneswar Center"))
    );

    public static final String DEFAULT_CENTER_NAME = "Maaya World Hyderabad";

    private final LocationRepository locationRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final OnDutyRequestRepository onDutyRequestRepository;
    private final PayslipRepository payslipRepository;
    private final com.example.repository.PayrollRunRepository payrollRunRepository;

    public CenterService(LocationRepository locationRepository,
                         EmployeeRepository employeeRepository,
                         AttendanceRepository attendanceRepository,
                         LeaveRequestRepository leaveRequestRepository,
                         OnDutyRequestRepository onDutyRequestRepository,
                         PayslipRepository payslipRepository,
                         com.example.repository.PayrollRunRepository payrollRunRepository) {
        this.payrollRunRepository = payrollRunRepository;
        this.locationRepository = locationRepository;
        this.employeeRepository = employeeRepository;
        this.attendanceRepository = attendanceRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.onDutyRequestRepository = onDutyRequestRepository;
        this.payslipRepository = payslipRepository;
    }

    // ---------------------------------------------------------------- lookup

    /**
     * Finds a center by its exact name (case-insensitive), falling back to the legacy short names
     * ("Hyderabad", "Vizag", ...) that older clients and stored sessions may still send.
     * Never creates a center.
     */
    public Optional<Location> resolve(String name) {
        if (name == null || name.isBlank()) return Optional.empty();
        String clean = name.trim();
        Optional<Location> direct = locationRepository.findFirstByNameIgnoreCaseOrderByLocationIdAsc(clean);
        if (direct.isPresent()) return direct;
        for (CenterSeed seed : DEFAULT_CENTERS) {
            if (seed.legacyNames().stream().anyMatch(l -> l.equalsIgnoreCase(clean))) {
                return locationRepository.findFirstByNameIgnoreCaseOrderByLocationIdAsc(seed.name());
            }
        }
        return Optional.empty();
    }

    /** Like {@link #resolve} but rejects unknown names with 400 instead of silently creating a center. */
    public Location require(String name) {
        return resolve(name).orElseThrow(() -> new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Unknown center: " + name + ". Create it in Settings first."));
    }

    public Location getById(int id) {
        return locationRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Center not found"));
    }

    public List<Map<String, Object>> listWithStaff() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Location loc : locationRepository.findAllByOrderByNameAsc()) {
            result.add(toView(loc));
        }
        return result;
    }

    public Map<String, Object> toView(Location loc) {
        List<Employee> staff = employeeRepository.findByLocation_LocationId(loc.getLocationId());
        List<Map<String, Object>> managers = new ArrayList<>();
        long activeStaff = 0;
        for (Employee e : staff) {
            boolean active = !"TERMINATED".equalsIgnoreCase(e.getStatus());
            if (active) activeStaff++;
            if (active && "MANAGER".equalsIgnoreCase(e.getRole())) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", e.getId());
                m.put("fullName", e.getFullName());
                m.put("email", e.getEmail());
                m.put("phone", e.getPhone() != null ? e.getPhone() : "");
                m.put("designation", e.getJobTitle() != null ? e.getJobTitle() : "");
                managers.add(m);
            }
        }
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", loc.getLocationId());
        view.put("name", loc.getName());
        view.put("centerType", loc.getCenterType() != null ? loc.getCenterType() : Location.TYPE_CENTER);
        view.put("city", loc.getCity() != null ? loc.getCity() : "");
        view.put("state", loc.getState() != null ? loc.getState() : "");
        view.put("address", loc.getAddress() != null ? loc.getAddress() : "");
        view.put("latitude", loc.getLatitude());
        view.put("longitude", loc.getLongitude());
        view.put("radiusMeters", loc.getRadiusMeters() != null ? loc.getRadiusMeters() : Location.DEFAULT_RADIUS_METERS);
        view.put("staffCount", activeStaff);
        view.put("managers", managers);
        return view;
    }

    // ---------------------------------------------------------------- create / update / delete

    @Transactional
    public Location create(Map<String, Object> body) {
        Location loc = new Location();
        applyFields(loc, body, true);
        ensureNameAvailable(loc.getName(), null);
        return locationRepository.save(loc);
    }

    /** Writes the old name into previousNameOut. Renames cascade to stored copies of the name. */
    @Transactional
    public Location update(int id, Map<String, Object> body, StringBuilder previousNameOut) {
        Location loc = getById(id);
        String previousName = loc.getName();
        previousNameOut.append(previousName != null ? previousName : "");
        applyFields(loc, body, false);
        if (loc.getName() != null && !loc.getName().equalsIgnoreCase(previousName)) {
            ensureNameAvailable(loc.getName(), id);
        }
        Location saved = locationRepository.save(loc);
        if (previousName != null && !previousName.equals(saved.getName())) {
            renameCopies(previousName, saved.getName());
        }
        return saved;
    }

    @Transactional
    public Location delete(int id) {
        Location loc = getById(id);
        long assigned = employeeRepository.findByLocation_LocationId(id).stream()
                .filter(e -> !"TERMINATED".equalsIgnoreCase(e.getStatus()))
                .count();
        if (assigned > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    loc.getName() + " still has " + assigned + " staff member" + (assigned == 1 ? "" : "s")
                            + ". Move them to another center before deleting it.");
        }
        if (payrollRunRepository.existsByLocation_LocationId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    loc.getName() + " has payroll history, so it cannot be deleted. Rename it instead if it has moved.");
        }
        // Deactivated staff keep their history; detach them so the foreign key does not block the delete
        for (Employee former : employeeRepository.findByLocation_LocationId(id)) {
            former.setLocation(null);
            employeeRepository.save(former);
        }
        locationRepository.delete(loc);
        return loc;
    }

    private void applyFields(Location loc, Map<String, Object> body, boolean creating) {
        String name = str(body.get("name"));
        if (creating || body.containsKey("name")) {
            if (name == null || name.length() < 3) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Center name must be at least 3 characters.");
            }
            if (name.length() > 80) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Center name must be 80 characters or fewer.");
            }
            loc.setName(name);
        }
        if (creating || body.containsKey("centerType")) {
            String type = str(body.get("centerType"));
            loc.setCenterType(Location.TYPE_GAMING_ZONE.equalsIgnoreCase(type) ? Location.TYPE_GAMING_ZONE : Location.TYPE_CENTER);
        }
        if (creating || body.containsKey("city")) {
            String city = str(body.get("city"));
            if (city == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "City is required.");
            }
            loc.setCity(city);
        }
        if (body.containsKey("state")) loc.setState(str(body.get("state")));
        if (body.containsKey("address")) loc.setAddress(str(body.get("address")));
        if (creating) loc.setCountry("India");

        if (creating || body.containsKey("latitude") || body.containsKey("longitude")) {
            Double lat = num(body.get("latitude"));
            Double lng = num(body.get("longitude"));
            if ((lat == null) != (lng == null)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter both latitude and longitude, or leave both empty.");
            }
            if (lat != null && (lat < -90 || lat > 90 || lng < -180 || lng > 180)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Latitude or longitude is out of range.");
            }
            loc.setLatitude(lat);
            loc.setLongitude(lng);
        }
        if (creating || body.containsKey("radiusMeters")) {
            Double radius = num(body.get("radiusMeters"));
            int r = radius != null ? (int) Math.round(radius) : Location.DEFAULT_RADIUS_METERS;
            if (r < 50 || r > 5000) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Check-in radius must be between 50 and 5000 meters.");
            }
            loc.setRadiusMeters(r);
        }
    }

    private void ensureNameAvailable(String name, Integer selfId) {
        for (Location other : locationRepository.findAllByNameIgnoreCaseOrderByLocationIdAsc(name)) {
            if (selfId == null || other.getLocationId() != selfId) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "A center named \"" + name + "\" already exists.");
            }
        }
    }

    private void renameCopies(String oldName, String newName) {
        attendanceRepository.renameLocation(oldName, newName);
        leaveRequestRepository.renameLocation(oldName, newName);
        onDutyRequestRepository.renameLocation(oldName, newName);
        payslipRepository.renameLocation(oldName, newName);
    }

    // ---------------------------------------------------------------- startup migration

    /**
     * One-time migration: renames the old short-named locations to "Maaya World ..." names, merges
     * case-variant duplicates, fills in geofence coordinates and rewrites stored name copies.
     *
     * It runs only while no location has a center type yet (a fresh or pre-centers database). After that
     * the admin owns the list, so centers they rename or delete in Settings are never recreated on restart.
     */
    @Transactional
    public void migrateLegacyCenters() {
        if (locationRepository.existsByCenterTypeIsNotNull()) {
            assignUnassignedEmployees();
            return;
        }
        System.out.println("Migrating locations to Maaya World centers (one-time)...");
        for (CenterSeed seed : DEFAULT_CENTERS) {
            List<Location> candidates = new ArrayList<>(locationRepository.findAllByNameIgnoreCaseOrderByLocationIdAsc(seed.name()));
            for (String legacy : seed.legacyNames()) {
                candidates.addAll(locationRepository.findAllByNameIgnoreCaseOrderByLocationIdAsc(legacy));
            }

            Location canonical;
            if (candidates.isEmpty()) {
                canonical = new Location();
                canonical.setName(seed.name());
                canonical.setCountry("India");
                System.out.println("Created center: " + seed.name());
            } else {
                canonical = candidates.get(0);
                for (Location duplicate : candidates.subList(1, candidates.size())) {
                    if (duplicate.getLocationId() == canonical.getLocationId()) continue;
                    for (Employee e : employeeRepository.findByLocation_LocationId(duplicate.getLocationId())) {
                        e.setLocation(canonical);
                        employeeRepository.save(e);
                    }
                    locationRepository.delete(duplicate);
                    System.out.println("Merged duplicate location \"" + duplicate.getName() + "\" into " + seed.name());
                }
                if (!seed.name().equals(canonical.getName())) {
                    System.out.println("Renamed location \"" + canonical.getName() + "\" to " + seed.name());
                    canonical.setName(seed.name());
                }
            }
            if (canonical.getCenterType() == null) canonical.setCenterType(Location.TYPE_CENTER);
            if (canonical.getCity() == null || seed.legacyNames().stream().anyMatch(l -> l.equalsIgnoreCase(canonical.getCity()))
                    || seed.name().equalsIgnoreCase(canonical.getCity())) {
                canonical.setCity(seed.city());
            }
            if (canonical.getState() == null) canonical.setState(seed.state());
            if (canonical.getAddress() == null || canonical.getAddress().isBlank()) canonical.setAddress(seed.address());
            if (canonical.getLatitude() == null || canonical.getLongitude() == null) {
                canonical.setLatitude(seed.latitude());
                canonical.setLongitude(seed.longitude());
            }
            if (canonical.getRadiusMeters() == null) canonical.setRadiusMeters(Location.DEFAULT_RADIUS_METERS);
            locationRepository.save(canonical);

            for (String legacy : seed.legacyNames()) {
                int rows = attendanceRepository.renameLocation(legacy, seed.name())
                        + leaveRequestRepository.renameLocation(legacy, seed.name())
                        + onDutyRequestRepository.renameLocation(legacy, seed.name())
                        + payslipRepository.renameLocation(legacy, seed.name());
                if (rows > 0) {
                    System.out.println("Updated " + rows + " record(s) from \"" + legacy + "\" to " + seed.name());
                }
            }
        }

        assignUnassignedEmployees();
    }

    /**
     * Safe to run on every start: gives active staff without a center the head center (or, if that was
     * deleted, the oldest remaining center). Logs and skips when no center exists; never throws.
     */
    @Transactional
    public void assignUnassignedEmployees() {
        List<Employee> unassigned = employeeRepository.findByLocationIsNull().stream()
                .filter(e -> !"TERMINATED".equalsIgnoreCase(e.getStatus()))
                .toList();
        if (unassigned.isEmpty()) return;
        Optional<Location> fallback = locationRepository.findFirstByNameIgnoreCaseOrderByLocationIdAsc(DEFAULT_CENTER_NAME)
                .or(locationRepository::findFirstByOrderByLocationIdAsc);
        if (fallback.isEmpty()) {
            System.out.println(unassigned.size() + " employee(s) have no center and no centers exist yet; create one in Settings.");
            return;
        }
        for (Employee e : unassigned) {
            e.setLocation(fallback.get());
            employeeRepository.save(e);
        }
        System.out.println("Assigned " + unassigned.size() + " employee(s) without a center to " + fallback.get().getName());
    }

    // ---------------------------------------------------------------- helpers

    private static String str(Object raw) {
        if (raw == null) return null;
        String s = raw.toString().trim();
        return s.isEmpty() ? null : s;
    }

    private static Double num(Object raw) {
        String s = str(raw);
        if (s == null) return null;
        try {
            return Double.parseDouble(s);
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "\"" + s + "\" is not a valid number.");
        }
    }
}
