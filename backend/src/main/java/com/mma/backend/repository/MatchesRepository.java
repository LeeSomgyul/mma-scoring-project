package com.mma.backend.repository;

import com.mma.backend.entity.Matches;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MatchesRepository extends JpaRepository<Matches, Long> {
    boolean existsByMatchNumber(int matchNumber);
    Optional<Matches> findByMatchNumber(int matchNumber);
}
