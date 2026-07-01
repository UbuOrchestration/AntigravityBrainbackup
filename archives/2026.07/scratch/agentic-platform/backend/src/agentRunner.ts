import { EventEmitter } from 'events';

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'running' | 'error';
  cpuLimitMhz: number;
  memoryLimitMib: number;
  lastAction?: string;
  lastActive?: string;
}

export class AgentRunner extends EventEmitter {
  private agents: Map<string, Agent> = new Map();

  constructor() {
    super();
    this.initializeAgents();
  }

  private initializeAgents() {
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

    this.agents.set('news', {
      id: 'news',
      name: 'Cutting Edge',
      role: 'Daily AI News & Updates Agent',
      status: 'idle',
      cpuLimitMhz: 500,
      memoryLimitMib: 256,
      lastAction: 'Ready to monitor feeds and deliver updates.',
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

  public getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  public getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  public updateAgentLimits(id: string, cpuLimitMhz: number, memoryLimitMib: number): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    agent.cpuLimitMhz = cpuLimitMhz;
    agent.memoryLimitMib = memoryLimitMib;
    agent.lastActive = new Date().toISOString();
    this.emit('agentUpdated', agent);
    return true;
  }

  public setAgentStatus(id: string, status: 'idle' | 'running' | 'error', lastAction?: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    agent.status = status;
    if (lastAction) agent.lastAction = lastAction;
    agent.lastActive = new Date().toISOString();
    this.emit('agentUpdated', agent);
    return true;
  }
}
