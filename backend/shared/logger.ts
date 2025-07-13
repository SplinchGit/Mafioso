import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogGroupCommand, CreateLogStreamCommand, DescribeLogGroupsCommand, DescribeLogStreamsCommand } from '@aws-sdk/client-cloudwatch-logs';

export interface LogContext {
  requestId?: string;
  userId?: string;
  operation?: string;
  [key: string]: any;
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export class CloudWatchLogger {
  private client: CloudWatchLogsClient;
  private logGroupName: string;
  private logStreamName: string;
  private sequenceToken?: string;

  constructor(logGroupName?: string) {
    this.client = new CloudWatchLogsClient({ region: process.env.AWS_REGION || 'us-east-1' });
    // Use the actual Lambda log group name from environment or construct it
    this.logGroupName = logGroupName || `/aws/lambda/${process.env.AWS_LAMBDA_FUNCTION_NAME}` || '/aws/lambda/mafioso';
    this.logStreamName = this.generateLogStreamName();
  }

  private generateLogStreamName(): string {
    const date = new Date().toISOString().split('T')[0];
    const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME || 'unknown';
    const randomId = Math.random().toString(36).substring(2, 8);
    return `${date}/${functionName}/${randomId}`;
  }

  private async ensureLogGroupExists(): Promise<void> {
    try {
      const command = new DescribeLogGroupsCommand({
        logGroupNamePrefix: this.logGroupName
      });
      const response = await this.client.send(command);
      
      if (!response.logGroups?.some(group => group.logGroupName === this.logGroupName)) {
        await this.client.send(new CreateLogGroupCommand({
          logGroupName: this.logGroupName
        }));
      }
    } catch (error) {
      console.error('Failed to ensure log group exists:', error);
    }
  }

  private async ensureLogStreamExists(): Promise<void> {
    try {
      const command = new DescribeLogStreamsCommand({
        logGroupName: this.logGroupName,
        logStreamNamePrefix: this.logStreamName
      });
      const response = await this.client.send(command);
      
      if (!response.logStreams?.some(stream => stream.logStreamName === this.logStreamName)) {
        await this.client.send(new CreateLogStreamCommand({
          logGroupName: this.logGroupName,
          logStreamName: this.logStreamName
        }));
      } else {
        this.sequenceToken = response.logStreams[0]?.uploadSequenceToken;
      }
    } catch (error) {
      console.error('Failed to ensure log stream exists:', error);
    }
  }

  private async sendLogEvent(level: LogLevel, message: string, context?: LogContext): Promise<void> {
    const logEvent = {
      timestamp: Date.now(),
      message: JSON.stringify({
        level,
        message,
        context,
        timestamp: new Date().toISOString()
      })
    };

    try {
      await this.ensureLogGroupExists();
      await this.ensureLogStreamExists();

      const command = new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [logEvent],
        sequenceToken: this.sequenceToken
      });

      const response = await this.client.send(command);
      this.sequenceToken = response.nextSequenceToken;
    } catch (error) {
      console.error('Failed to send log to CloudWatch:', error);
      console.log(`Fallback log [${level}]:`, message, context);
    }
  }

  async info(message: string, context?: LogContext): Promise<void> {
    await this.sendLogEvent('INFO', message, context);
  }

  async warn(message: string, context?: LogContext): Promise<void> {
    await this.sendLogEvent('WARN', message, context);
  }

  async error(message: string, context?: LogContext): Promise<void> {
    await this.sendLogEvent('ERROR', message, context);
  }

  async debug(message: string, context?: LogContext): Promise<void> {
    await this.sendLogEvent('DEBUG', message, context);
  }

  infoSync(message: string, context?: LogContext): void {
    this.sendLogEvent('INFO', message, context).catch(() => {});
  }

  warnSync(message: string, context?: LogContext): void {
    this.sendLogEvent('WARN', message, context).catch(() => {});
  }

  errorSync(message: string, context?: LogContext): void {
    this.sendLogEvent('ERROR', message, context).catch(() => {});
  }

  debugSync(message: string, context?: LogContext): void {
    this.sendLogEvent('DEBUG', message, context).catch(() => {});
  }
}

const logger = new CloudWatchLogger();
export default logger;