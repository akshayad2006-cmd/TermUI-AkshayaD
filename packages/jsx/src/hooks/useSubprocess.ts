import { getCurrentApp } from '../runtime.js';

export interface UseSubprocessResult {
    run: (cmd: string[]) => Promise<number>;
}

export function useSubprocess(): UseSubprocessResult {
    async function run(cmd: string[]): Promise<number> {
        if (cmd.length === 0) {
            throw new Error('useSubprocess.run requires a command');
        }

        const app = getCurrentApp();

        app?.terminal.exitRawMode();

        try {
            const proc = Bun.spawn(cmd, {
                stdin: 'inherit',
                stdout: 'inherit',
                stderr: 'inherit',
            });

            return await proc.exited;
        } finally {
            app?.terminal.enterRawMode();
            app?.screen.invalidate();
            app?.requestRender();
        }
    }

    return { run };
}