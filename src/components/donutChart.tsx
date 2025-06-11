import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function DonutChart({ label, value, color }: { label: string, value: number, color: string }) {
    const data = {
        labels: [label, 'เหลือ'],
        datasets: [
            {
                label,
                data: [value, 100 - value],
                backgroundColor: [
                    color,
                    'rgba(211, 211, 211, 0.3)',
                ],
                borderWidth: 0,
                cutout: '70%',
            },
        ],
    };

    const options = {
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true },
        },
        maintainAspectRatio: false,
    };

    return (
        <div style={{ width: '100px', height: '100px', position: 'relative' }}>
            <Doughnut data={data} options={options} />
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    color,
                    userSelect: 'none',
                }}
            >
                {value}%
            </div>
        </div>
    );
}

export default DonutChart;
