package com.mma.backend.repository;

import com.mma.backend.entity.Judges;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JudgesRepository extends JpaRepository<Judges, Long> {
    Optional<Judges> findByDevicedId(String deviceId);
    int countByIsConnectedTrue();
}
