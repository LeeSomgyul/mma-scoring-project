package com.mma.backend.repository;

import com.mma.backend.entity.Matches;
import com.mma.backend.entity.Rounds;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoundsRepository extends JpaRepository<Rounds, Long> {
    List<Rounds> findByMatches_Id(Long matchId);
    void deleteByMatches_Id(Long matchId);
}
