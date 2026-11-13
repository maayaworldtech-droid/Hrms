package com.example.repository;

import com.example.entity.DailyCollection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyCollectionRepository extends JpaRepository<DailyCollection, Long> {

    Optional<DailyCollection> findByLocation_LocationIdAndCollectionDate(int locationId, LocalDate date);

    List<DailyCollection> findByCollectionDateBetweenOrderByCollectionDateDescIdDesc(LocalDate from, LocalDate to);

    List<DailyCollection> findByLocation_LocationIdAndCollectionDateBetweenOrderByCollectionDateDesc(int locationId, LocalDate from, LocalDate to);
}
