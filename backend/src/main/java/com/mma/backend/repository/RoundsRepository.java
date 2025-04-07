package com.mma.backend.repository;

import com.mma.backend.entity.Rounds;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoundsRepository extends JpaRepository<Rounds, Long> {
    List<Rounds> findByMatchId(Long matchId);
}
