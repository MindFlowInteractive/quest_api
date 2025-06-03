import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionsService } from './sessions.service';

@WebSocketGateway({ namespace: '/game/sessions' })
export class SessionsGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly sessionsService: SessionsService) {}

  @SubscribeMessage('joinSession')
  async handleJoinSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(data.sessionId);
    client.emit('joinedSession', { sessionId: data.sessionId });
  }

  @SubscribeMessage('submitMove')
  async handleSubmitMove(
    @MessageBody() data: { sessionId: string; playerId: string; move: unknown },
  ) {
    const session = await this.sessionsService.submitMove(data.sessionId, {
      sessionId: data.sessionId,
      playerId: data.playerId,
      move: data.move,
    });
    if (session) {
      this.server.to(data.sessionId).emit('sessionUpdate', session);
    }
  }

  @SubscribeMessage('pauseSession')
  async handlePauseSession(@MessageBody() data: { sessionId: string }) {
    const session = await this.sessionsService.pauseSession(data.sessionId);
    if (session) {
      this.server.to(data.sessionId).emit('sessionUpdate', session);
    }
  }

  @SubscribeMessage('resumeSession')
  async handleResumeSession(@MessageBody() data: { sessionId: string }) {
    const session = await this.sessionsService.resumeSession(data.sessionId);
    if (session) {
      this.server.to(data.sessionId).emit('sessionUpdate', session);
    }
  }

  @SubscribeMessage('terminateSession')
  async handleTerminateSession(@MessageBody() data: { sessionId: string }) {
    const success = await this.sessionsService.terminateSession(data.sessionId);
    if (success) {
      this.server
        .to(data.sessionId)
        .emit('sessionTerminated', { sessionId: data.sessionId });
    }
  }
}
