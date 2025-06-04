import { Puzzle } from "@/modules/puzzles/entities/puzzle.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { PuzzleComponent } from "../entities/puzzle-component.entity";
import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { VersionHistory } from "../entities/version-history.entity";

@Injectable()
export class PuzzleService {
  constructor(
    @InjectRepository(Puzzle) private puzzleRepo: Repository<Puzzle>,
    @InjectRepository(PuzzleComponent) private componentRepo: Repository<PuzzleComponent>,
    @InjectRepository(VersionHistory) private versionRepo: Repository<VersionHistory>,
  ) {}

  async createPuzzle(title: string, layout: any, createdBy: string) {
    const puzzle = this.puzzleRepo.create({ title, layout, createdBy });
    return this.puzzleRepo.save(puzzle);
  }

  async addComponent(puzzleId: number, type: string, config: any, position: string) {
    const puzzle = await this.puzzleRepo.findOneBy({ id: puzzleId });
    const component = this.componentRepo.create({ type, config, position, puzzle });
    return this.componentRepo.save(component);
  }

  async validatePuzzle(puzzleId: number): Promise<boolean> {
    const puzzle = await this.puzzleRepo.findOne({ where: { id: puzzleId }, relations: ['components'] });
    if (!puzzle || puzzle.components.length === 0) return false;
    // Example logic: at least one component and a layout
    return Boolean(puzzle.layout && puzzle.components.length);
  }

  async createVersion(puzzleId: number, changedBy: string) {
    const puzzle = await this.puzzleRepo.findOne({ where: { id: puzzleId } });
    const snapshot = { ...puzzle };
    const version = this.versionRepo.create({ puzzle, snapshot, changedBy });
    return this.versionRepo.save(version);
  }
}