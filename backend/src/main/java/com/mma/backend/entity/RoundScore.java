package com.mma.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;


@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"match_id", "judge_id", "round_number"})
        }
)
public class RoundScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long roundId;

    @ManyToOne
    @JoinColumn(name = "match_id")
    private Match match;

    @ManyToOne
    @JoinColumn(name = "judge_id")
    private Judge judge;

    private int roundNumber;

    private int redScore;

    private int blueScore;

    private boolean submitted;

    private LocalDateTime submittedAt;
}
