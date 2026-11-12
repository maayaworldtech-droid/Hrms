package com.example.repository;

import com.example.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocationRepository extends JpaRepository<Location, Integer> {
    /** Returns the first match; older databases may hold case-variant duplicates until migrated. */
    Optional<Location> findFirstByNameIgnoreCaseOrderByLocationIdAsc(String name);

    List<Location> findAllByNameIgnoreCaseOrderByLocationIdAsc(String name);

    List<Location> findAllByOrderByNameAsc();

    Optional<Location> findFirstByOrderByLocationIdAsc();

    /** True once the center migration has run (legacy rows have no type). */
    boolean existsByCenterTypeIsNotNull();
}
