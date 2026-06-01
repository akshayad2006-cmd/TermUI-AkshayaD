import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSubprocess } from './useSubprocess.js';
import { setCurrentApp } from '../runtime.js';

const mockSpawn = vi.fn();

(globalThis as any).Bun = {
    spawn: mockSpawn,
};

describe('useSubprocess', () => {
    beforeEach(() => {
        mockSpawn.mockReset();
    });

    afterEach(() => {
        setCurrentApp(null);
    });

    it('spawns a subprocess with inherited stdio and returns the exit code', async () => {
        mockSpawn.mockImplementation(() => ({
            exited: Promise.resolve(7),
        }));

        const subprocess = useSubprocess();
        const code = await subprocess.run(['git', 'status']);

        expect(mockSpawn).toHaveBeenCalledWith(['git', 'status'], {
            stdin: 'inherit',
            stdout: 'inherit',
            stderr: 'inherit',
        });
        expect(code).toBe(7);
    });

    it('exits raw mode before spawning and restores the TUI after exit', async () => {
        const app = {
            terminal: {
                exitRawMode: vi.fn(),
                enterRawMode: vi.fn(),
            },
            screen: {
                invalidate: vi.fn(),
            },
            requestRender: vi.fn(),
        } as any;

        setCurrentApp(app);

        mockSpawn.mockImplementation(() => ({
            exited: Promise.resolve(0),
        }));

        const subprocess = useSubprocess();
        const code = await subprocess.run(['vim', 'file.txt']);

        expect(app.terminal.exitRawMode).toHaveBeenCalledOnce();
        expect(app.terminal.enterRawMode).toHaveBeenCalledOnce();
        expect(app.screen.invalidate).toHaveBeenCalledOnce();
        expect(app.requestRender).toHaveBeenCalledOnce();
        expect(code).toBe(0);
    });

    it('restores raw mode and re-renders even when spawning throws', async () => {
        const app = {
            terminal: {
                exitRawMode: vi.fn(),
                enterRawMode: vi.fn(),
            },
            screen: {
                invalidate: vi.fn(),
            },
            requestRender: vi.fn(),
        } as any;

        setCurrentApp(app);

        mockSpawn.mockImplementation(() => {
            throw new Error('spawn failed');
        });

        const subprocess = useSubprocess();

        await expect(subprocess.run(['bad-command'])).rejects.toThrow('spawn failed');

        expect(app.terminal.exitRawMode).toHaveBeenCalledOnce();
        expect(app.terminal.enterRawMode).toHaveBeenCalledOnce();
        expect(app.screen.invalidate).toHaveBeenCalledOnce();
        expect(app.requestRender).toHaveBeenCalledOnce();
    });

    it('throws when command is empty', async () => {
        const subprocess = useSubprocess();

        await expect(subprocess.run([])).rejects.toThrow(
            'useSubprocess.run requires a command',
        );
    });
});