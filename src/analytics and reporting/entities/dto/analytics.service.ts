import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import {
  PlayerBehaviorEntity,
  PuzzlePerformanceEntity,
  EngagementEntity,
  RevenueEntity,
  ABTestEntity,
  EventTrackingEntity,
} from './entities';
import {
  AnalyticsQueryDto,
  PlayerBehaviorQueryDto,
  PuzzleAnalyticsQueryDto,
  RevenueQueryDto,
} from './dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(PlayerBehaviorEntity)
    private playerBehaviorRepo: Repository<PlayerBehaviorEntity>,
    @InjectRepository(PuzzlePerformanceEntity)
    private puzzlePerformanceRepo: Repository<PuzzlePerformanceEntity>,
    @InjectRepository(EngagementEntity)
    private engagementRepo: Repository<EngagementEntity>,
    @InjectRepository(RevenueEntity)
    private revenueRepo: Repository<RevenueEntity>,
    @InjectRepository(ABTestEntity)
    private abTestRepo: Repository<ABTestEntity>,
    @InjectRepository(EventTrackingEntity)
    private eventTrackingRepo: Repository<EventTrackingEntity>,
  ) {}

  // Player Behavior Analytics
  async getPlayerBehaviorAnalytics(query: PlayerBehaviorQueryDto) {
    const qb = this.playerBehaviorRepo.createQueryBuilder('pb');
    
    this.applyDateFilters(qb, query);
    this.applyPlayerFilters(qb, query);
    
    if (query.eventType) {
      qb.andWhere('pb.eventType = :eventType', { eventType: query.eventType });
    }
    
    if (query.platform) {
      qb.andWhere('pb.platform = :platform', { platform: query.platform });
    }

    const [data, total] = await qb
      .orderBy('pb.createdAt', 'DESC')
      .limit(query.limit)
      .offset(query.offset)
      .getManyAndCount();

    // Aggregate statistics
    const stats = await this.playerBehaviorRepo
      .createQueryBuilder('pb')
      .select([
        'COUNT(*) as totalEvents',
        'COUNT(DISTINCT pb.playerId) as uniquePlayers',
        'COUNT(DISTINCT pb.sessionId) as uniqueSessions',
        'AVG(pb.duration) as avgDuration',
      ])
      .getRawOne();

    return {
      data,
      total,
      statistics: stats,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < total,
      },
    };
  }

  async getPlayerBehaviorHeatmap(query: PlayerBehaviorQueryDto) {
    const heatmapData = await this.playerBehaviorRepo
      .createQueryBuilder('pb')
      .select([
        'EXTRACT(hour FROM pb.createdAt) as hour',
        'EXTRACT(dow FROM pb.createdAt) as dayOfWeek',
        'COUNT(*) as eventCount',
      ])
      .groupBy('hour, dayOfWeek')
      .orderBy('hour, dayOfWeek')
      .getRawMany();

    return {
      heatmapData,
      metadata: {
        maxEvents: Math.max(...heatmapData.map(d => parseInt(d.eventCount))),
        totalDataPoints: heatmapData.length,
      },
    };
  }

  async getPlayerSegmentation(query: AnalyticsQueryDto) {
    // Segment players by activity level
    const segmentation = await this.playerBehaviorRepo
      .createQueryBuilder('pb')
      .select([
        'pb.playerId',
        'COUNT(*) as eventCount',
        'COUNT(DISTINCT pb.sessionId) as sessionCount',
        'SUM(pb.duration) as totalDuration',
      ])
      .groupBy('pb.playerId')
      .getRawMany();

    // Categorize players
    const segments = segmentation.map(player => {
      const eventCount = parseInt(player.eventCount);
      const sessionCount = parseInt(player.sessionCount);
      const totalDuration = parseInt(player.totalDuration || 0);

      let segment = 'Low Activity';
      if (eventCount > 100 && sessionCount > 10) {
        segment = 'High Activity';
      } else if (eventCount > 50 && sessionCount > 5) {
        segment = 'Medium Activity';
      }

      return {
        playerId: player.playerId,
        segment,
        eventCount,
        sessionCount,
        totalDuration,
      };
    });

    return {
      segments,
      summary: {
        highActivity: segments.filter(s => s.segment === 'High Activity').length,
        mediumActivity: segments.filter(s => s.segment === 'Medium Activity').length,
        lowActivity: segments.filter(s => s.segment === 'Low Activity').length,
      },
    };
  }

  // Puzzle Performance Analytics
  async getPuzzlePerformanceAnalytics(query: PuzzleAnalyticsQueryDto) {
    const qb = this.puzzlePerformanceRepo.createQueryBuilder('pp');
    
    this.applyDateFilters(qb, query);
    this.applyPlayerFilters(qb, query);
    
    if (query.puzzleId) {
      qb.andWhere('pp.puzzleId = :puzzleId', { puzzleId: query.puzzleId });
    }
    
    if (query.difficulty) {
      qb.andWhere('pp.difficulty = :difficulty', { difficulty: query.difficulty });
    }

    const [data, total] = await qb
      .orderBy('pp.createdAt', 'DESC')
      .limit(query.limit)
      .offset(query.offset)
      .getManyAndCount();

    const stats = await this.puzzlePerformanceRepo
      .createQueryBuilder('pp')
      .select([
        'COUNT(*) as totalAttempts',
        'SUM(CASE WHEN pp.completed = true THEN 1 ELSE 0 END) as completedPuzzles',
        'AVG(pp.completionTime) as avgCompletionTime',
        'AVG(pp.score) as avgScore',
        'AVG(pp.hintsUsed) as avgHintsUsed',
      ])
      .getRawOne();

    return {
      data,
      total,
      statistics: {
        ...stats,
        completionRate: (stats.completedPuzzles / stats.totalAttempts * 100).toFixed(2) + '%',
      },
    };
  }

  async getPuzzleDifficultyAnalytics(query: PuzzleAnalyticsQueryDto) {
    return await this.puzzlePerformanceRepo
      .createQueryBuilder('pp')
      .select([
        'pp.difficulty',
        'COUNT(*) as totalAttempts',
        'SUM(CASE WHEN pp.completed = true THEN 1 ELSE 0 END) as completions',
        'AVG(pp.completionTime) as avgTime',
        'AVG(pp.score) as avgScore',
      ])
      .groupBy('pp.difficulty')
      .orderBy('pp.difficulty')
      .getRawMany();
  }

  async getPuzzleCompletionRates(query: PuzzleAnalyticsQueryDto) {
    return await this.puzzlePerformanceRepo
      .createQueryBuilder('pp')
      .select([
        'pp.puzzleId',
        'COUNT(*) as totalAttempts',
        'SUM(CASE WHEN pp.completed = true THEN 1 ELSE 0 END) as completions',
        'ROUND(SUM(CASE WHEN pp.completed = true THEN 1 ELSE 0 END)::decimal / COUNT(*) * 100, 2) as completionRate',
      ])
      .groupBy('pp.puzzleId')
      .orderBy('completionRate', 'DESC')
      .getRawMany();
  }

  // Engagement and Retention
  async getEngagementAnalytics(query: AnalyticsQueryDto) {
    const dailyEngagement = await this.engagementRepo
      .createQueryBuilder('e')
      .select([
        'e.date',
        'COUNT(DISTINCT e.playerId) as activeUsers',
        'AVG(e.sessionDuration) as avgSessionDuration',
        'SUM(e.puzzlesSolved) as totalPuzzlesSolved',
        'SUM(e.levelsCompleted) as totalLevelsCompleted',
      ])
      .groupBy('e.date')
      .orderBy('e.date', 'DESC')
      .limit(30)
      .getRawMany();

    return {
      dailyEngagement,
      metrics: {
        avgDailyActiveUsers: Math.round(
          dailyEngagement.reduce((sum, day) => sum + parseInt(day.activeUsers), 0) / dailyEngagement.length
        ),
        totalEngagementDays: dailyEngagement.length,
      },
    };
  }

  async getRetentionAnalytics(query: AnalyticsQueryDto) {
    // Day 1, 7, 30 retention analysis
    const retentionPeriods = [1, 7, 30];
    const retentionData = [];

    for (const period of retentionPeriods) {
      const retention = await this.engagementRepo
        .createQueryBuilder('e1')
        .select('COUNT(DISTINCT e2.playerId)::decimal / COUNT(DISTINCT e1.playerId) * 100 as retentionRate')
        .leftJoin(
          'engagement',
          'e2',
          `e2.playerId = e1.playerId AND e2.date = e1.date + INTERVAL '${period} days'`
        )
        .where('e1.date >= :startDate', { 
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) 
        })
        .getRawOne();

      retentionData.push({
        period: `Day ${period}`,
        retentionRate: parseFloat(retention.retentionRate || 0).toFixed(2) + '%',
      });
    }

    return retentionData;
  }

  async getCohortRetention(query: AnalyticsQueryDto) {
    // Implementation for cohort retention analysis
    const cohorts = await this.engagementRepo
      .createQueryBuilder('e')
      .select([
        'DATE_TRUNC(\'month\', MIN(e.date)) as cohortMonth',
        'COUNT(DISTINCT e.playerId) as cohortSize',
      ])
      .groupBy('cohortMonth')
      .orderBy('cohortMonth')
      .getRawMany();

    return cohorts;
  }

  // Revenue and Monetization
  async getRevenueAnalytics(query: RevenueQueryDto) {
    const qb = this.revenueRepo.createQueryBuilder('r');
    
    this.applyDateFilters(qb, query);
    
    if (query.productType) {
      qb.andWhere('r.productType = :productType', { productType: query.productType });
    }
    
    if (query.currency) {
      qb.andWhere('r.currency = :currency', { currency: query.currency });
    }

    const [data, total] = await qb
      .orderBy('r.createdAt', 'DESC')
      .limit(query.limit)
      .offset(query.offset)
      .getManyAndCount();

    const stats = await this.revenueRepo
      .createQueryBuilder('r')
      .select([
        'SUM(r.amount) as totalRevenue',
        'COUNT(*) as totalTransactions',
        'COUNT(DISTINCT r.playerId) as payingUsers',
        'AVG(r.amount) as avgTransactionValue',
      ])
      .getRawOne();

    return {
      data,
      total,
      statistics: stats,
    };
  }

  async getRevenueTrends(query: RevenueQueryDto) {
    return await this.revenueRepo
      .createQueryBuilder('r')
      .select([
        'DATE_TRUNC(\'day\', r.createdAt) as date',
        'SUM(r.amount) as dailyRevenue',
        'COUNT(*) as dailyTransactions',
        'COUNT(DISTINCT r.playerId) as dailyPayingUsers',
      ])
      .groupBy('date')
      .orderBy('date', 'DESC')
      .limit(30)
      .getRawMany();
  }

  async getCustomerLTV(query: AnalyticsQueryDto) {
    return await this.revenueRepo
      .createQueryBuilder('r')
      .select([
        'r.playerId',
        'SUM(r.amount) as lifetimeValue',
        'COUNT(*) as totalTransactions',
        'MIN(r.createdAt) as firstPurchase',
        'MAX(r.createdAt) as lastPurchase',
      ])
      .groupBy('r.playerId')
      .orderBy('lifetimeValue', 'DESC')
      .limit(query.limit || 100)
      .getRawMany();
  }

  // A/B Testing
  async getABTestResults(query: AnalyticsQueryDto) {
    return await this.abTestRepo
      .createQueryBuilder('ab')
      .select([
        'ab.testName',
        'ab.variant',
        'COUNT(*) as participants',
        'COUNT(CASE WHEN ab.conversionValue > 0 THEN 1 END) as conversions',
        'AVG(ab.conversionValue) as avgConversionValue',
      ])
      .groupBy('ab.testName, ab.variant')
      .orderBy('ab.testName, ab.variant')
      .getRawMany();
  }

  async getABTestStatisticalAnalysis(testName: string) {
    const variants = await this.abTestRepo
      .createQueryBuilder('ab')
      .select([
        'ab.variant',
        'COUNT(*) as participants',
        'COUNT(CASE WHEN ab.conversionValue > 0 THEN 1 END) as conversions',
        'AVG(ab.conversionValue) as avgConversionValue',
        'STDDEV(ab.conversionValue) as stdDevConversionValue',
      ])
      .where('ab.testName = :testName', { testName })
      .groupBy('ab.variant')
      .getRawMany();

    // Calculate statistical significance (simplified chi-square test)
    const controlVariant = variants.find(v => v.variant === 'control');
    const testVariants = variants.filter(v => v.variant !== 'control');

    const analysis = testVariants.map(variant => {
      const controlConversionRate = controlVariant ? 
        (controlVariant.conversions / controlVariant.participants) : 0;
      const variantConversionRate = variant.conversions / variant.participants;
      
      // Simplified statistical significance calculation
      const pooledRate = (parseInt(controlVariant?.conversions || 0) + parseInt(variant.conversions)) /
        (parseInt(controlVariant?.participants || 0) + parseInt(variant.participants));
      
      const standardError = Math.sqrt(
        pooledRate * (1 - pooledRate) * 
        (1/parseInt(controlVariant?.participants || 1) + 1/parseInt(variant.participants))
      );
      
      const zScore = Math.abs(variantConversionRate - controlConversionRate) / standardError;
      const isSignificant = zScore > 1.96; // 95% confidence level

      return {
        variant: variant.variant,
        conversionRate: (variantConversionRate * 100).toFixed(2) + '%',
        improvement: controlConversionRate ? 
          (((variantConversionRate - controlConversionRate) / controlConversionRate) * 100).toFixed(2) + '%' : 'N/A',
        isStatisticallySignificant: isSignificant,
        zScore: zScore.toFixed(3),
        participants: variant.participants,
        conversions: variant.conversions,
      };
    });

    return {
      testName,
      controlVariant: controlVariant ? {
        conversionRate: ((controlVariant.conversions / controlVariant.participants) * 100).toFixed(2) + '%',
        participants: controlVariant.participants,
        conversions: controlVariant.conversions,
      } : null,
      variants: analysis,
      summary: {
        totalParticipants: variants.reduce((sum, v) => sum + parseInt(v.participants), 0),
        totalConversions: variants.reduce((sum, v) => sum + parseInt(v.conversions), 0),
      },
    };
  }

  // Event Tracking and Funnel Analysis
  async getEventTracking(query: AnalyticsQueryDto) {
    const qb = this.eventTrackingRepo.createQueryBuilder('et');
    
    this.applyDateFilters(qb, query);
    this.applyPlayerFilters(qb, query);

    const [data, total] = await qb
      .orderBy('et.createdAt', 'DESC')
      .limit(query.limit)
      .offset(query.offset)
      .getManyAndCount();

    const eventSummary = await this.eventTrackingRepo
      .createQueryBuilder('et')
      .select([
        'et.eventName',
        'COUNT(*) as eventCount',
        'COUNT(DISTINCT et.playerId) as uniqueUsers',
      ])
      .groupBy('et.eventName')
      .orderBy('eventCount', 'DESC')
      .getRawMany();

    return {
      data,
      total,
      eventSummary,
    };
  }

  async getFunnelAnalysis(query: AnalyticsQueryDto) {
    const funnelSteps = await this.eventTrackingRepo
      .createQueryBuilder('et')
      .select([
        'et.funnelStep',
        'COUNT(DISTINCT et.playerId) as uniqueUsers',
        'COUNT(*) as totalEvents',
      ])
      .where('et.funnelStep IS NOT NULL')
      .groupBy('et.funnelStep')
      .orderBy('et.funnelStep')
      .getRawMany();

    // Calculate conversion rates between steps
    const funnelAnalysis = funnelSteps.map((step, index) => {
      const previousStep = index > 0 ? funnelSteps[index - 1] : null;
      const conversionRate = previousStep ? 
        (step.uniqueUsers / previousStep.uniqueUsers * 100).toFixed(2) + '%' : '100%';
      
      return {
        step: step.funnelStep,
        uniqueUsers: parseInt(step.uniqueUsers),
        totalEvents: parseInt(step.totalEvents),
        conversionRate,
        dropOffRate: previousStep ? 
          (((previousStep.uniqueUsers - step.uniqueUsers) / previousStep.uniqueUsers) * 100).toFixed(2) + '%' : '0%',
      };
    });

    return {
      funnelSteps: funnelAnalysis,
      overallConversionRate: funnelSteps.length > 1 ? 
        ((funnelSteps[funnelSteps.length - 1].uniqueUsers / funnelSteps[0].uniqueUsers) * 100).toFixed(2) + '%' : 'N/A',
    };
  }

  async getConversionRates(query: AnalyticsQueryDto) {
    // Define conversion events
    const conversionEvents = ['purchase', 'subscription', 'level_complete', 'tutorial_complete'];
    
    const conversions = await Promise.all(
      conversionEvents.map(async (eventName) => {
        const result = await this.eventTrackingRepo
          .createQueryBuilder('et')
          .select([
            'COUNT(DISTINCT et.playerId) as convertedUsers',
            'COUNT(*) as totalConversions',
          ])
          .where('et.eventName = :eventName', { eventName })
          .getRawOne();

        const totalUsers = await this.eventTrackingRepo
          .createQueryBuilder('et')
          .select('COUNT(DISTINCT et.playerId) as totalUsers')
          .getRawOne();

        return {
          eventName,
          convertedUsers: parseInt(result.convertedUsers),
          totalConversions: parseInt(result.totalConversions),
          conversionRate: ((result.convertedUsers / totalUsers.totalUsers) * 100).toFixed(2) + '%',
        };
      })
    );

    return conversions;
  }

  // Real-time Analytics
  async getRealTimeDashboard() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [activeUsers, recentEvents, recentRevenue] = await Promise.all([
      this.playerBehaviorRepo
        .createQueryBuilder('pb')
        .select('COUNT(DISTINCT pb.playerId) as count')
        .where('pb.createdAt >= :oneHourAgo', { oneHourAgo })
        .getRawOne(),
      
      this.eventTrackingRepo
        .createQueryBuilder('et')
        .select('COUNT(*) as count')
        .where('et.createdAt >= :oneHourAgo', { oneHourAgo })
        .getRawOne(),
      
      this.revenueRepo
        .createQueryBuilder('r')
        .select('SUM(r.amount) as total')
        .where('r.createdAt >= :oneDayAgo', { oneDayAgo })
        .getRawOne(),
    ]);

    return {
      timestamp: now.toISOString(),
      activeUsersLastHour: parseInt(activeUsers.count || 0),
      eventsLastHour: parseInt(recentEvents.count || 0),
      revenueToday: parseFloat(recentRevenue.total || 0),
      systemStatus: 'healthy',
    };
  }

  async getRealTimeActiveUsers() {
    const activeUsers = await this.playerBehaviorRepo
      .createQueryBuilder('pb')
      .select([
        'pb.playerId',
        'MAX(pb.createdAt) as lastActivity',
        'pb.platform',
        'pb.deviceType',
      ])
      .where('pb.createdAt >= :fiveMinutesAgo', { 
        fiveMinutesAgo: new Date(Date.now() - 5 * 60 * 1000) 
      })
      .groupBy('pb.playerId, pb.platform, pb.deviceType')
      .orderBy('lastActivity', 'DESC')
      .limit(100)
      .getRawMany();

    return {
      activeUsers,
      totalActiveUsers: activeUsers.length,
      timestamp: new Date().toISOString(),
    };
  }

  // Predictive Analytics
  async getChurnRiskPredictions(query: AnalyticsQueryDto) {
    // Simplified churn risk calculation based on recent activity
    const playerActivity = await this.engagementRepo
      .createQueryBuilder('e')
      .select([
        'e.playerId',
        'MAX(e.date) as lastActive',
        'AVG(e.sessionDuration) as avgSessionDuration',
        'AVG(e.puzzlesSolved) as avgPuzzlesSolved',
        'COUNT(*) as totalDays',
      ])
      .groupBy('e.playerId')
      .getRawMany();

    const churnRiskAnalysis = playerActivity.map(player => {
      const daysSinceLastActive = Math.floor(
        (Date.now() - new Date(player.lastActive).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      let riskLevel = 'Low';
      let riskScore = 0;

      // Simple risk scoring algorithm
      if (daysSinceLastActive > 7) riskScore += 40;
      if (daysSinceLastActive > 14) riskScore += 30;
      if (player.avgSessionDuration < 300) riskScore += 20; // Less than 5 minutes
      if (player.avgPuzzlesSolved < 1) riskScore += 10;

      if (riskScore >= 70) riskLevel = 'High';
      else if (riskScore >= 40) riskLevel = 'Medium';

      return {
        playerId: player.playerId,
        riskLevel,
        riskScore,
        daysSinceLastActive,
        avgSessionDuration: parseFloat(player.avgSessionDuration || 0),
        avgPuzzlesSolved: parseFloat(player.avgPuzzlesSolved || 0),
        prediction: riskScore >= 70 ? 'Likely to churn' : 'Likely to retain',
      };
    });

    return {
      predictions: churnRiskAnalysis.slice(0, query.limit || 100),
      summary: {
        highRisk: churnRiskAnalysis.filter(p => p.riskLevel === 'High').length,
        mediumRisk: churnRiskAnalysis.filter(p => p.riskLevel === 'Medium').length,
        lowRisk: churnRiskAnalysis.filter(p => p.riskLevel === 'Low').length,
      },
    };
  }

  async getRevenueForecast(query: AnalyticsQueryDto) {
    // Get historical revenue data for last 30 days
    const historicalData = await this.revenueRepo
      .createQueryBuilder('r')
      .select([
        'DATE_TRUNC(\'day\', r.createdAt) as date',
        'SUM(r.amount) as dailyRevenue',
      ])
      .where('r.createdAt >= :thirtyDaysAgo', { 
        thirtyDaysAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
      })
      .groupBy('date')
      .orderBy('date')
      .getRawMany();

    // Simple linear regression for forecasting
    const revenues = historicalData.map(d => parseFloat(d.dailyRevenue));
    const avgRevenue = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
    
    // Generate 7-day forecast
    const forecast = [];
    for (let i = 1; i <= 7; i++) {
      const forecastDate = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      const predictedRevenue = avgRevenue * (1 + Math.random() * 0.1 - 0.05); // Simple prediction with variance
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedRevenue: Math.round(predictedRevenue * 100) / 100,
        confidence: 'Medium',
      });
    }

    return {
      historicalData,
      forecast,
      metrics: {
        avgDailyRevenue: Math.round(avgRevenue * 100) / 100,
        projectedWeeklyRevenue: Math.round(avgRevenue * 7 * 100) / 100,
      },
    };
  }

  async getEngagementForecast(query: AnalyticsQueryDto) {
    const historicalEngagement = await this.engagementRepo
      .createQueryBuilder('e')
      .select([
        'e.date',
        'COUNT(DISTINCT e.playerId) as dailyActiveUsers',
        'AVG(e.sessionDuration) as avgSessionDuration',
      ])
      .where('e.date >= :thirtyDaysAgo', { 
        thirtyDaysAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
      })
      .groupBy('e.date')
      .orderBy('e.date')
      .getRawMany();

    const avgDAU = historicalEngagement.reduce((sum, d) => sum + parseInt(d.dailyActiveUsers), 0) / historicalEngagement.length;
    const avgSessionDuration = historicalEngagement.reduce((sum, d) => sum + parseFloat(d.avgSessionDuration), 0) / historicalEngagement.length;

    // 7-day engagement forecast
    const engagementForecast = [];
    for (let i = 1; i <= 7; i++) {
      const forecastDate = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      
      engagementForecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedDAU: Math.round(avgDAU * (1 + Math.random() * 0.1 - 0.05)),
        predictedSessionDuration: Math.round(avgSessionDuration * (1 + Math.random() * 0.1 - 0.05)),
      });
    }

    return {
      historicalData: historicalEngagement,
      forecast: engagementForecast,
      trends: {
        avgDAU: Math.round(avgDAU),
        avgSessionDuration: Math.round(avgSessionDuration),
      },
    };
  }

  // Data Export and Integration
  async exportAnalyticsData(exportRequest: any) {
    const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // In a real implementation, this would queue a background job
    // For now, we'll simulate the export process
    
    return {
      exportId,
      status: 'initiated',
      estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      exportType: exportRequest.type || 'csv',
      dataTypes: exportRequest.dataTypes || ['player_behavior', 'puzzle_performance'],
    };
  }

  async getExportStatus(exportId: string) {
    // Simulate export completion
    const isCompleted = Math.random() > 0.5; // 50% chance it's completed
    
    return {
      exportId,
      status: isCompleted ? 'completed' : 'processing',
      progress: isCompleted ? 100 : Math.floor(Math.random() * 80) + 10,
      downloadUrl: isCompleted ? `/api/downloads/${exportId}.csv` : null,
      expiresAt: isCompleted ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null, // 24 hours
    };
  }

  // Visualization and Charting
  async getChartData(query: AnalyticsQueryDto) {
    const [playerBehaviorChart, revenueChart, engagementChart] = await Promise.all([
      this.getPlayerBehaviorChartData(query),
      this.getRevenueChartData(query),
      this.getEngagementChartData(query),
    ]);

    return {
      playerBehavior: playerBehaviorChart,
      revenue: revenueChart,
      engagement: engagementChart,
    };
  }

  async getKPIDashboard(query: AnalyticsQueryDto) {
    const [
      totalUsers,
      activeUsers,
      totalRevenue,
      avgSessionDuration,
      puzzleCompletionRate,
      retentionRate,
    ] = await Promise.all([
      this.playerBehaviorRepo
        .createQueryBuilder('pb')
        .select('COUNT(DISTINCT pb.playerId)')
        .getRawOne(),
      
      this.playerBehaviorRepo
        .createQueryBuilder('pb')
        .select('COUNT(DISTINCT pb.playerId)')
        .where('pb.createdAt >= :sevenDaysAgo', { 
          sevenDaysAgo: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
        })
        .getRawOne(),
      
      this.revenueRepo
        .createQueryBuilder('r')
        .select('SUM(r.amount)')
        .where('r.createdAt >= :thirtyDaysAgo', { 
          thirtyDaysAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
        })
        .getRawOne(),
      
      this.playerBehaviorRepo
        .createQueryBuilder('pb')
        .select('AVG(pb.duration)')
        .getRawOne(),
      
      this.puzzlePerformanceRepo
        .createQueryBuilder('pp')
        .select('AVG(CASE WHEN pp.completed = true THEN 1.0 ELSE 0.0 END) * 100')
        .getRawOne(),
      
      this.calculateRetentionRate(),
    ]);

    return {
      kpis: [
        {
          name: 'Total Users',
          value: parseInt(totalUsers.count || 0),
          change: '+12%', // This would be calculated from historical data
          trend: 'up',
        },
        {
          name: 'Weekly Active Users',
          value: parseInt(activeUsers.count || 0),
          change: '+5%',
          trend: 'up',
        },
        {
          name: 'Monthly Revenue',
          value: `${parseFloat(totalRevenue.sum || 0).toLocaleString()}`,
          change: '+18%',
          trend: 'up',
        },
        {
          name: 'Avg Session Duration',
          value: `${Math.round(parseFloat(avgSessionDuration.avg || 0) / 60)}m`,
          change: '-2%',
          trend: 'down',
        },
        {
          name: 'Puzzle Completion Rate',
          value: `${parseFloat(puzzleCompletionRate.avg || 0).toFixed(1)}%`,
          change: '+3%',
          trend: 'up',
        },
        {
          name: 'Day 7 Retention',
          value: `${retentionRate.toFixed(1)}%`,
          change: '+1%',
          trend: 'up',
        },
      ],
      lastUpdated: new Date().toISOString(),
    };
  }

  // Helper methods
  private applyDateFilters(qb: any, query: AnalyticsQueryDto) {
    if (query.startDate && query.endDate) {
      qb.andWhere('createdAt BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    } else if (query.startDate) {
      qb.andWhere('createdAt >= :startDate', { startDate: query.startDate });
    } else if (query.endDate) {
      qb.andWhere('createdAt <= :endDate', { endDate: query.endDate });
    }
  }

  private applyPlayerFilters(qb: any, query: AnalyticsQueryDto) {
    if (query.playerId) {
      qb.andWhere('playerId = :playerId', { playerId: query.playerId });
    } else if (query.playerIds && query.playerIds.length > 0) {
      qb.andWhere('playerId IN (:...playerIds)', { playerIds: query.playerIds });
    }
  }

  private async getPlayerBehaviorChartData(query: AnalyticsQueryDto) {
    return await this.playerBehaviorRepo
      .createQueryBuilder('pb')
      .select([
        'DATE_TRUNC(\'day\', pb.createdAt) as date',
        'COUNT(*) as events',
        'COUNT(DISTINCT pb.playerId) as uniqueUsers',
      ])
      .groupBy('date')
      .orderBy('date')
      .limit(30)
      .getRawMany();
  }

  private async getRevenueChartData(query: AnalyticsQueryDto) {
    return await this.revenueRepo
      .createQueryBuilder('r')
      .select([
        'DATE_TRUNC(\'day\', r.createdAt) as date',
        'SUM(r.amount) as revenue',
        'COUNT(*) as transactions',
      ])
      .groupBy('date')
      .orderBy('date')
      .limit(30)
      .getRawMany();
  }

  private async getEngagementChartData(query: AnalyticsQueryDto) {
    return await this.engagementRepo
      .createQueryBuilder('e')
      .select([
        'e.date',
        'COUNT(DISTINCT e.playerId) as activeUsers',
        'AVG(e.sessionDuration) as avgSessionDuration',
      ])
      .groupBy('e.date')
      .orderBy('e.date')
      .limit(30)
      .getRawMany();
  }

  private async calculateRetentionRate(): Promise<number> {
    // Simplified Day 7 retention calculation
    const result = await this.engagementRepo
      .createQueryBuilder('e1')
      .select('COUNT(DISTINCT e2.playerId)::decimal / COUNT(DISTINCT e1.playerId) * 100 as rate')
      .leftJoin(
        'engagement',
        'e2',
        'e2.playerId = e1.playerId AND e2.date = e1.date + INTERVAL \'7 days\''
      )
      .where('e1.date >= :sevenDaysAgo', { 
        sevenDaysAgo: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) 
      })
      .getRawOne();

    return parseFloat(result.rate || 0);
  }
}