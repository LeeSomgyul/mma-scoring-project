package com.mma.backend.repository;

import com.mma.backend.entity.Matches;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MatchesRepository extends JpaRepository<Matches, Long> {
    Optional<Matches> findByMatchNumber(int matchNumber);
    List<Matches> findAllByOrderByIdAsc();//✅ ID기준으로 오름차순 정렬된 모든 경기 가져오기
}
