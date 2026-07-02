'use client';

import { useEffect, useRef } from 'react';

interface FractalTreeProps {
    primaryColor?: string;
    maxDepth?: number;
    branchLength?: number;
    branchProbability?: number;
}

const FractalTree = ({
    primaryColor = 'rgba(0, 0, 0, 0.25)', // Increased visibility
    maxDepth = 11,
    branchLength = 100, // Long branches
    branchProbability = 0.6,
}: FractalTreeProps) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0;
        let height = 0;

        const resizeCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            const w = window.innerWidth;
            const h = window.innerHeight;

            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;

            ctx.scale(dpr, dpr);
            width = w;
            height = h;

            start();
        };

        const r180 = Math.PI;
        const r90 = Math.PI / 2;
        const r15 = Math.PI / 12;
        const { random } = Math;

        let steps: (() => void)[] = [];

        const polar2cart = (x = 0, y = 0, r = 0, theta = 0) => {
            const dx = r * Math.cos(theta);
            const dy = r * Math.sin(theta);
            return [x + dx, y + dy];
        };

        const step = (x: number, y: number, rad: number, depth: number = 0) => {
            if (depth > maxDepth) return;

            const length = random() * branchLength * (1 - depth / maxDepth * 0.4);
            const [nx, ny] = polar2cart(x, y, length, rad);

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(nx, ny);
            ctx.stroke();

            if (nx < -200 || nx > width + 200 || ny < -200 || ny > height + 200) return;

            const rate = depth < (maxDepth * 0.3) ? 0.95 : branchProbability;
            const angleVar = r15 * (1 + depth / maxDepth);

            if (random() < rate) steps.push(() => step(nx, ny, rad + random() * angleVar, depth + 1));
            if (random() < rate) steps.push(() => step(nx, ny, rad - random() * angleVar, depth + 1));
        };

        const growInstantly = () => {
            let count = 0;
            while (steps.length > 0 && count < 15000) {
                const currentSteps = steps;
                steps = [];
                currentSteps.forEach(i => i());
                count += currentSteps.length;
            }
        };

        const start = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.lineWidth = 1.0;
            ctx.strokeStyle = primaryColor;
            steps = [];

            // Spawn roots
            steps.push(() => step(width * 0.2, height + 10, -r90, 0));
            steps.push(() => step(width * 0.8, height + 10, -r90, 0));
            steps.push(() => step(-10, height * 0.4, 0, 0));
            steps.push(() => step(width + 10, height * 0.6, r180, 0));

            growInstantly();
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [primaryColor, maxDepth, branchLength, branchProbability]);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
    );
};

export default FractalTree;
