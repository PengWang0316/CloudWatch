import AWSXray from 'aws-xray-sdk';
import log from '@kevinwang0316/log';

process.env.AWS_LAMBDA_FUNCTION_NAME = 'functionName';
process.env.AWS_LAMBDA_FUNCTION_VERSION = 'functionVersion';
process.env.AWS_LAMBDA_LOG_GROUP_NAME = 'logGroupName';
// process.env.name_space = 'namespace';
process.env.STAGE = 'stage';

const cloudwatch = require('../src/CloudWatch');

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
    console.log = jest.fn();
  });

  beforeEach(() => {
    log.debug.mockClear();
    log.warn.mockClear();
    console.log.mockClear();
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
    expect(log.debug).toHaveBeenNthCalledWith(1, 'flushing [1] metrics to CloudWatch: my count with values: 1');
    expect(log.debug).toHaveBeenLastCalledWith('flushed [1] metrics to CloudWatch: my count with values: 1');
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

  test('incrCount undefined count with async mode', () => {
    process.env.async_metrics = true;
    cloudwatch.incrCount('myMetricName');

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenLastCalledWith('MONITORING|1|count|myMetricName|logGroupName');
    process.env.async_metrics = false;
  });

  test('incrCount 2 count with async mode', () => {
    process.env.async_metrics = true;
    cloudwatch.incrCount('myMetricName', 2);

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenLastCalledWith('MONITORING|2|count|myMetricName|logGroupName');
    process.env.async_metrics = false;
  });

  test('incrCount 1 count with sync mode', () => {
    cloudwatch.incrCount('myMetricName', 1);

    expect(console.log).not.toHaveBeenCalled();

    cloudwatch.flush();
    expect(log.debug).toHaveBeenLastCalledWith('flushing [1] metrics to CloudWatch: myMetricName with values: 1');

    cloudwatch.incrCount('myMetricName', 1);
    cloudwatch.incrCount('myMetricName', 2);
    cloudwatch.flush();
    expect(log.debug).toHaveBeenLastCalledWith('flushing [1] metrics to CloudWatch: myMetricName with values: 3');
  });
});
