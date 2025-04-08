package com.mma.backend.repository;

import com.mma.backend.entity.JudgeAccess;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JudgeAccessRepository extends JpaRepository<JudgeAccess, Long> {

    Optional<JudgeAccess> findByAccessCode(String accessCode);
}
