package com.mma.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "judge_access_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JudgeAccess {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String password;

    @Column(name = "access_code", unique = true, nullable = false)
    private String accessCode;

    @Column(name = "is_used")
    private boolean isUsed = false;
}
