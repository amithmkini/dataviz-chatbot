import React from 'react';

interface FollowupPanelProps {
    question: string;
}

export function FollowupPanel({ question }: FollowupPanelProps) {
    return (
        <div>
            <p>{question}</p>
        </div>
    );
}