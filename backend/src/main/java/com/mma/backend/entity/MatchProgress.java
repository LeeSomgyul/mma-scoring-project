package com.mma.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "match_progress")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "current_match_id", nullable = false)
    private Matches currentMatch;//현재 진행 중인 경기

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_round_id")
    private Rounds currentRound;//현재 진행중인 라운드

    @Column(name = "current_round_number")
    private Integer currentRoundNumber;//현재 라운드 번호

    @Column(name = "is_locked")
    private Boolean isLocked = false;//점수 입력 및 수정 가능한지 여부

    @Column(name = "is_end_of_match")
    private Boolean isEndOfMatch = false;//해당 경기가 종료되었는지 여부

    @Column(name = "judge_count")
    private Integer judgeCount;//현재 경기의 심판 수

}
