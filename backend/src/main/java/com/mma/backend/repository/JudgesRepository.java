package com.mma.backend.repository;

import com.mma.backend.entity.Judges;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JudgesRepository extends JpaRepository<Judges, Long> {
    Optional<Judges> findByDeviceId(String deviceId);
    int countByIsConnectedTrue();
    List<Judges> findByMatch_Id(Long matchId);
    List<Judges> findByIsConnectedTrue();
    Optional<Judges> findByDeviceIdAndMatch_Id(String deviceId, Long matchId);
}
