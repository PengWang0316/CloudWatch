import AWSXray from 'aws-xray-sdk';
import log from '@kevinwang0316/log';

import * as cloudwatch from '../src/CloudWatch';

jest.mock('aws-sdk', () => ({}));
jest.mock('aws-xray-sdk', () => ({
  captureAWS: jest.fn().mockReturnValue({
    CloudWatch: jest.fn().mockReturnValue({
      putMetricData: jest.fn().mockReturnValue({ promise: jest.fn() }),
    }),
  }),
}));

describe('CloudWatch Test', () => {
  beforeAll(() => {
    process.env.AWS_LAMBDA_FUNCTION_NAME = 'functionName';
    process.env.AWS_LAMBDA_FUNCTION_VERSION = 'functionVersion';
    process.env.AWS_LAMBDA_LOG_GROUP_NAME = 'logGroupName';
    process.env.STAGE = 'stage';
  });

  test('AWSXray captureAWS is called', () => {
    expect(AWSXray.captureAWS).toHaveBeenCalledTimes(1);
  });

  test('flush with empty countDatum and timeDatum', async () => {
    const result = await cloudwatch.flush();

    expect(result).toBeUndefined();
  });
});
