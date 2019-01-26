import AWSXray from 'aws-xray-sdk';
import log from '@kevinwang0316/log';

import * as cloudwatch from '../src/CloudWatch';

// const mockPutMetricData = jest.fn().mockReturnValue({ promise: jest.fn() });

jest.mock('aws-sdk', () => ({}));
jest.mock('aws-xray-sdk', () => ({
  captureAWS: jest.fn().mockReturnValue({
    CloudWatch: jest.fn().mockImplementation(() => ({ putMetricData: jest.fn().mockReturnValue({ promise: jest.fn() }) })),
  }),
}));
jest.mock('@kevinwang0316/log', () => ({ debug: jest.fn(), warn: jest.fn() }));

describe('CloudWatch Test', () => {
  beforeAll(() => {
    process.env.AWS_LAMBDA_FUNCTION_NAME = 'functionName';
    process.env.AWS_LAMBDA_FUNCTION_VERSION = 'functionVersion';
    process.env.AWS_LAMBDA_LOG_GROUP_NAME = 'logGroupName';
    process.env.STAGE = 'stage';
  });

  beforeEach(() => {
    log.debug.mockClear();
    log.warn.mockClear();
  });

  test('AWSXray captureAWS is called', () => {
    expect(AWSXray.captureAWS).toHaveBeenCalledTimes(1);
  });

  test('flush with empty countDatum and timeDatum', async () => {
    const result = await cloudwatch.flush();

    expect(result).toBeUndefined();
    expect(log.debug).not.toHaveBeenCalled();
    expect(log.warn).not.toHaveBeenCalled();
    // expect(mockPutMetricData).not.toHaveBeenCalled();
  });

  test('flush with no empty countDatum and timeDatum', async () => {
    cloudwatch.incrCount('my count', 1);
    const result = await cloudwatch.flush();

    expect(result).toBeUndefined();
    expect(log.debug).toHaveBeenCalledTimes(2);
    expect(log.debug).toHaveBeenNthCalledWith(1, 'flushing [1] metrics to CloudWatch: my count');
    expect(log.debug).toHaveBeenLastCalledWith('flushed [1] metrics to CloudWatch: my count');
    expect(log.warn).not.toHaveBeenCalled();
    // expect(mockPutMetricData).not.toHaveBeenCalled();
  });

  test('flush with no empty countDatum and timeDatum with error', async () => {
    // AWSXray.captureAWS().CloudWatch().putMetricData.mockImplementationOnce(() => { throw new Error('error message'); });
    log.debug.mockImplementationOnce(() => jest.fn());
    // Use log.debug to simulate throwing error.
    log.debug.mockImplementationOnce(() => { throw new Error('error message'); });
    cloudwatch.incrCount('my count', 1);
    const result = await cloudwatch.flush();

    expect(result).toBeUndefined();
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenLastCalledWith('cloudn\'t flush [1] CloudWatch metrics', null, new Error('error message'));
    // expect(mockPutMetricData).not.toHaveBeenCalled();
  });
});
