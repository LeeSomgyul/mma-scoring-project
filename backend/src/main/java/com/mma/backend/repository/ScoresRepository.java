package com.mma.backend.repository;

import com.mma.backend.entity.Judges;
import com.mma.backend.entity.Rounds;
import com.mma.backend.entity.Scores;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScoresRepository extends JpaRepository<Scores, Long> {
    List<Scores> findByRounds_Id(Long roundId);
    Optional<Scores> findByRounds_IdAndJudges_Id(Long roundId, Long judgeId);
    int countByRounds(Rounds round);

    @Query("SELECT COUNT(DISTINCT s.judges.id) FROM Scores s WHERE s.rounds.id = :roundId")
    int countDistinctJudgeByRound(@Param("roundId") Long roundId);
}
