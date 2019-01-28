import AWSXray from 'aws-xray-sdk';
import log from '@kevinwang0316/log';
import sinon from 'sinon';

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
    expect(log.debug).toHaveBeenCalledTimes(3);
    expect(log.debug).toHaveBeenNthCalledWith(1, 'flushing [1] metrics to CloudWatch: my count');
    expect(log.debug).toHaveBeenNthCalledWith(2, 'flushed [1] metrics to CloudWatch: my count');
    expect(log.debug).toHaveBeenLastCalledWith('{"MetricData":[{"MetricName":"my count","Dimensions":[{"Name":"Function","Value":"functionName"},{"Name":"Version","Value":"functionVersion"},{"Name":"Stage","Value":"stage"}],"Unit":"Count","Value":1}],"Namespace":"logGroupName"}');
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

  test('clear', async () => {
    cloudwatch.incrCount('myMetricName', 2);
    cloudwatch.clear();
    const result = await cloudwatch.flush();

    expect(result).toBeUndefined();
    expect(log.debug).not.toHaveBeenCalled();
    expect(log.warn).not.toHaveBeenCalled();
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
``
  test('incrCount 1 count with sync mode', async () => {
    cloudwatch.incrCount('myMetricName', 1);

    expect(console.log).not.toHaveBeenCalled();

    await cloudwatch.flush();
    expect(log.debug).toHaveBeenLastCalledWith('{"MetricData":[{"MetricName":"myMetricName","Dimensions":[{"Name":"Function","Value":"functionName"},{"Name":"Version","Value":"functionVersion"},{"Name":"Stage","Value":"stage"}],"Unit":"Count","Value":1}],"Namespace":"logGroupName"}');

    cloudwatch.incrCount('myMetricName', 1);
    cloudwatch.incrCount('myMetricName', 2);
    await cloudwatch.flush();
    expect(log.debug).toHaveBeenLastCalledWith('{"MetricData":[{"MetricName":"myMetricName","Dimensions":[{"Name":"Function","Value":"functionName"},{"Name":"Version","Value":"functionVersion"},{"Name":"Stage","Value":"stage"}],"Unit":"Count","Value":3}],"Namespace":"logGroupName"}');
  });

  test('recordTimeInMillis without ms and not equal 0', () => {
    cloudwatch.recordTimeInMillis('metric name');

    expect(log.debug).not.toHaveBeenCalled();
  });

  test('recordTimeInMillis with async mode', () => {
    process.env.async_metrics = true;
    cloudwatch.recordTimeInMillis('metric name', 0);

    expect(log.debug).toHaveBeenCalledTimes(1);
    expect(log.debug).toHaveBeenLastCalledWith('new execution time for [metric name] : 0 milliseconds');
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenLastCalledWith('MONITORING|0|milliseconds|metric name|logGroupName');

    process.env.async_metrics = false;
  });

  test('recordTimeInMillis with sync mode one call', async () => {
    cloudwatch.recordTimeInMillis('metric name', 100);

    expect(log.debug).toHaveBeenCalledTimes(1);
    expect(log.debug).toHaveBeenLastCalledWith('new execution time for [metric name] : 100 milliseconds');
    expect(console.log).not.toHaveBeenCalled();

    await cloudwatch.flush();
    expect(log.debug).toHaveBeenCalledTimes(4);
    expect(log.debug).toHaveBeenLastCalledWith('{"MetricData":[{"MetricName":"metric name","Dimensions":[{"Name":"Function","Value":"functionName"},{"Name":"Version","Value":"functionVersion"},{"Name":"Stage","Value":"stage"}],"Unit":"Milliseconds","StatisticValues":{"Maximum":100,"Minimum":100,"SampleCount":1,"Sum":100}}],"Namespace":"logGroupName"}');
  });

  test('recordTimeInMillis with sync mode multiple calls', async () => {
    cloudwatch.recordTimeInMillis('metric name', 100);
    cloudwatch.recordTimeInMillis('metric name', 300);
    cloudwatch.recordTimeInMillis('metric name', 200);

    await cloudwatch.flush();
    expect(log.debug).toHaveBeenCalledTimes(6);
    expect(log.debug).toHaveBeenLastCalledWith('{"MetricData":[{"MetricName":"metric name","Dimensions":[{"Name":"Function","Value":"functionName"},{"Name":"Version","Value":"functionVersion"},{"Name":"Stage","Value":"stage"}],"Unit":"Milliseconds","StatisticValues":{"Maximum":300,"Minimum":100,"SampleCount":3,"Sum":600}}],"Namespace":"logGroupName"}');
  });

  test('trackExecTime without metricName', () => {
    expect(() => cloudwatch.trackExecTime(null, () => {})).toThrowError();
    expect(() => cloudwatch.trackExecTime(undefined, () => {})).toThrowError();
    expect(() => cloudwatch.trackExecTime('', () => {})).toThrowError();
  });

  test('trackExecTime without function', () => {
    expect(() => cloudwatch.trackExecTime('metricName')).toThrowError();
    expect(() => cloudwatch.trackExecTime('metricName', null)).toThrowError();
  });

  test('trackExecTime with a non promise function', async () => {
    const clock = sinon.useFakeTimers();
    const result = cloudwatch.trackExecTime('trackName', () => 'result');
    await cloudwatch.flush();

    expect(result).toBe('result');
    expect(log.debug).toHaveBeenLastCalledWith('{"MetricData":[{"MetricName":"trackName","Dimensions":[{"Name":"Function","Value":"functionName"},{"Name":"Version","Value":"functionVersion"},{"Name":"Stage","Value":"stage"}],"Unit":"Milliseconds","StatisticValues":{"Maximum":0,"Minimum":0,"SampleCount":1,"Sum":0}}],"Namespace":"logGroupName"}');
    clock.restore();
  });

  test('trackExecTime with a promise function', async () => {
    const clock = sinon.useFakeTimers();
    const result = await cloudwatch.trackExecTime('trackName', () => new Promise(resolve => resolve('result')));
    await cloudwatch.flush();

    expect(result).toBe('result');
    expect(log.debug).toHaveBeenLastCalledWith('{"MetricData":[{"MetricName":"trackName","Dimensions":[{"Name":"Function","Value":"functionName"},{"Name":"Version","Value":"functionVersion"},{"Name":"Stage","Value":"stage"}],"Unit":"Milliseconds","StatisticValues":{"Maximum":0,"Minimum":0,"SampleCount":1,"Sum":0}}],"Namespace":"logGroupName"}');
    clock.restore();
  });
});
