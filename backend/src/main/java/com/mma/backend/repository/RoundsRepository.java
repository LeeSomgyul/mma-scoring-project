package com.mma.backend.repository;

import com.mma.backend.entity.Matches;
import com.mma.backend.entity.Rounds;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoundsRepository extends JpaRepository<Rounds, Long> {
    List<Rounds> findByMatchId(Long matchId);
    void deleteByMatchId(Long matchId);
    Optional<Rounds> findByMatchAndRoundNumber(Matches matches, int roundNumber);
    List<Rounds> findByMatch_Id(Long matchId);
}
