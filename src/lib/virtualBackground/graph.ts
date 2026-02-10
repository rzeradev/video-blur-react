export class Graph {
    private container: HTMLDivElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private data: Map<string, number[]> = new Map();
    private maxPoints = 100;

    constructor() {
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            padding: 10px;
            border-radius: 8px;
            z-index: 10000;
            font-family: monospace;
            color: white;
        `;

        this.canvas = document.createElement('canvas');
        this.canvas.width = 200;
        this.canvas.height = 100;
        this.container.appendChild(this.canvas);

        const ctx = this.canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get 2D context');
        this.ctx = ctx;

        document.body.appendChild(this.container);
    }

    push(value: number, label: string) {
        if (!this.data.has(label)) {
            this.data.set(label, []);
        }
        const arr = this.data.get(label)!;
        arr.push(value);
        if (arr.length > this.maxPoints) {
            arr.shift();
        }
        this.draw();
    }

    private draw() {
        const { ctx, canvas } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const colors = ['#00ff00', '#ff0000', '#0000ff', '#ffff00'];
        let colorIndex = 0;

        this.data.forEach((values, label) => {
            const color = colors[colorIndex % colors.length];
            colorIndex++;

            if (values.length < 2) return;

            const max = Math.max(...values, 1);
            const min = Math.min(...values, 0);
            const range = max - min || 1;

            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();

            values.forEach((v, i) => {
                const x = (i / (this.maxPoints - 1)) * canvas.width;
                const y = canvas.height - ((v - min) / range) * canvas.height;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();

            // Draw label and current value
            const lastValue = values[values.length - 1];
            ctx.fillStyle = color;
            ctx.font = '12px monospace';
            ctx.fillText(`${label}: ${lastValue.toFixed(1)}`, 5, 15 + colorIndex * 15);
        });
    }

    remove() {
        this.container.remove();
    }
}
