import { runRepricerIteration } from './src/tracker.js';
import * as configModule from './src/config.js';

async function test() {
    const originalLoadConfig = configModule.loadConfig;
    configModule.loadConfig = () => {
        const conf = originalLoadConfig();
        return { ...conf, refreshToken: 'mocked_token' };
    };
    await runRepricerIteration();
}

test();
