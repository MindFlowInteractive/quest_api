import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSessionDto } from './dto/create-session.dto';
import { SubmitMoveDto } from './dto/submit-move.dto';
import { SessionEntity } from './entities/session.orm-entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepo: Repository<SessionEntity>,
  ) {}

  async createSession(dto: CreateSessionDto): Promise<SessionEntity> {
    const session = this.sessionRepo.create({
      state: 'initialized',
      players: dto.players,
      moves: [],
      gameType: dto.gameType,
    });
    return this.sessionRepo.save(session);
  }

  async getSession(id: string): Promise<SessionEntity | undefined> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    return session ?? undefined;
  }

  async updateSessionState(
    id: string,
    state: string,
  ): Promise<SessionEntity | undefined> {
    await this.sessionRepo.update(id, { state });
    return this.getSession(id);
  }

  async submitMove(
    id: string,
    dto: SubmitMoveDto,
  ): Promise<SessionEntity | undefined> {
    const session = await this.getSession(id);
    if (session) {
      const move: { playerId: string; move: unknown; timestamp: Date } = {
        playerId: dto.playerId,
        move: dto.move,
        timestamp: new Date(),
      };
      session.moves.push(move);
      await this.sessionRepo.save(session);
    }
    return session;
  }

  async pauseSession(id: string): Promise<SessionEntity | undefined> {
    return this.updateSessionState(id, 'paused');
  }

  async resumeSession(id: string): Promise<SessionEntity | undefined> {
    return this.updateSessionState(id, 'active');
  }

  async terminateSession(id: string): Promise<boolean> {
    const result = await this.sessionRepo.delete(id);
    return !!result.affected && result.affected > 0;
  }

  getShareLink(id: string): string {
    return `/game/sessions/${id}/spectate`;
  }

  async spectateSession(id: string): Promise<SessionEntity | undefined> {
    return this.getSession(id);
  }

  async getSessionAnalytics(id: string): Promise<any> {
    const session = await this.getSession(id);
    if (!session) return null;
    return {
      movesCount: session.moves.length,
      duration:
        (session.updatedAt.getTime() - session.createdAt.getTime()) / 1000,
      players: session.players,
    };
  }

  async recoverSession(id: string): Promise<SessionEntity | undefined> {
    return this.getSession(id);
  }

  async getLeaderboard(): Promise<any[]> {
    const sessions = await this.sessionRepo.find();
    return sessions
      .sort((a, b) => b.moves.length - a.moves.length)
      .map((s) => ({ id: s.id, moves: s.moves.length, players: s.players }));
  }

  async exportSession(id: string): Promise<any> {
    const session = await this.getSession(id);
    if (!session) return null;
    return JSON.stringify(session);
  }

  async replaySession(id: string): Promise<any> {
    const session = await this.getSession(id);
    if (!session) return null;
    return session.moves;
  }
}
