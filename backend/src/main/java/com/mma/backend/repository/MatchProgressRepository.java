package com.mma.backend.repository;

import com.mma.backend.entity.MatchProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MatchProgressRepository extends JpaRepository<MatchProgress, Long> {
    Optional<MatchProgress> findTopByOrderByIdDesc();//현재 진행 중인 경기 정보 조회
}
