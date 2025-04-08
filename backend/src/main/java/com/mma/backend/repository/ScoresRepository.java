package com.mma.backend.repository;

import com.mma.backend.entity.Scores;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScoresRepository extends JpaRepository<Scores, Long> {
    List<Scores> findByRounds_Id(Long roundId);
}
