"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRunner = void 0;
const events_1 = require("events");
class AgentRunner extends events_1.EventEmitter {
    agents = new Map();
    constructor() {
        super();
        this.initializeAgents();
    }
    initializeAgents() {
        this.agents.set('ubu', {
            id: 'ubu',
            name: 'Ubu',
            role: 'Orchestrator',
            status: 'idle',
            cpuLimitMhz: 500,
            memoryLimitMib: 256,
            lastAction: 'Migrated platform to new environment.',
            lastActive: new Date().toISOString()
        });
        this.agents.set('ibi', {
            id: 'ibi',
            name: 'Ibi',
            role: 'Memory Retainer & Archiver',
            status: 'idle',
            cpuLimitMhz: 500,
            memoryLimitMib: 256,
            lastAction: 'Registered hourly backup task.',
            lastActive: new Date().toISOString()
        });
        this.agents.set('doc', {
            id: 'doc',
            name: 'Doc',
            role: 'Knowledge Base & Wiki',
            status: 'idle',
            cpuLimitMhz: 500,
            memoryLimitMib: 256,
            lastAction: 'Loaded core documentation index.',
            lastActive: new Date().toISOString()
        });
        this.agents.set('mealmate', {
            id: 'mealmate',
            name: 'MealMate',
            role: 'Meal Planner & Shopping',
            status: 'idle',
            cpuLimitMhz: 500,
            memoryLimitMib: 256,
            lastAction: 'Coordinated stockpile database loaded.',
            lastActive: new Date().toISOString()
        });
        this.agents.set('ebay_arbitrage', {
            id: 'ebay_arbitrage',
            name: 'eBay Arbitrage',
            role: 'RV & Convenience Arbitrage Store',
            status: 'idle',
            cpuLimitMhz: 500,
            memoryLimitMib: 256,
            lastAction: 'API connectivity verified. Waiting for scan.',
            lastActive: new Date().toISOString()
        });
        this.agents.set('leadgen_drafting', {
            id: 'leadgen_drafting',
            name: 'KANNEM CAD',
            role: 'AutoCAD Outreach & Lead Gen',
            status: 'idle',
            cpuLimitMhz: 500,
            memoryLimitMib: 256,
            lastAction: 'Target inboxes initialized.',
            lastActive: new Date().toISOString()
        });
    }
    getAgents() {
        return Array.from(this.agents.values());
    }
    getAgent(id) {
        return this.agents.get(id);
    }
    updateAgentLimits(id, cpuLimitMhz, memoryLimitMib) {
        const agent = this.agents.get(id);
        if (!agent)
            return false;
        agent.cpuLimitMhz = cpuLimitMhz;
        agent.memoryLimitMib = memoryLimitMib;
        agent.lastActive = new Date().toISOString();
        this.emit('agentUpdated', agent);
        return true;
    }
    setAgentStatus(id, status, lastAction) {
        const agent = this.agents.get(id);
        if (!agent)
            return false;
        agent.status = status;
        if (lastAction)
            agent.lastAction = lastAction;
        agent.lastActive = new Date().toISOString();
        this.emit('agentUpdated', agent);
        return true;
    }
}
exports.AgentRunner = AgentRunner;
