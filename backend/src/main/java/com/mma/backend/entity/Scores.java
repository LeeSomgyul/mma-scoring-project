package com.mma.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "scores",
        uniqueConstraints = @UniqueConstraint(columnNames = {"round_id", "judge_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Scores {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "round_id")
    private Rounds rounds;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "judge_id")
    private Judges judges;

    @Column(name = "red_score", nullable = true)
    private int redScore;

    @Column(name = "blue_score", nullable = true)
    private int blueScore;

    @Column(name = "is_submitted")
    private boolean isSubmitted;

    @Column(name = "submitted_at")
    @CreationTimestamp
    private LocalDateTime submittedAt;

    @Column(name = "is_editable")
    private boolean isEditable;
}
