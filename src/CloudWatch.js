import AWSXray from 'aws-xray-sdk';
import log from '@kevinwang0316/log';

const AWS = AWSXray.captureAWS(require('aws-sdk')); // Use the X-Ray to capture all request makes through AWS sdk

const cloudwatch = new AWS.CloudWatch();

// Use a user customized name space or Lambda's log group name as default
const namespace = process.env.name_space || process.env.AWS_LAMBDA_LOG_GROUP_NAME;
// The format for async is MONITORING|value|unit|name|namespace|dimensions1, dimension2, ...
const isAsyncMode = (process.env.async_metrics || 'false') === 'true'; // Check whether need to send metrics async for APIs

// the Lambda execution environment defines a number of env variables:
// https://docs.aws.amazon.com/lambda/latest/dg/current-supported-versions.html
// and the serverless framework also defines a STAGE env variable too
const dimensions = [
  { Name: 'Function', Value: process.env.AWS_LAMBDA_FUNCTION_NAME },
  { Name: 'Version', Value: process.env.AWS_LAMBDA_FUNCTION_VERSION },
  { Name: 'Stage', Value: process.env.STAGE },
].filter(dim => dim.Value);

let countMetrics = {};
let timeMetrics = {};

const getCountMetricData = (name, value) => ({
  MetricName: name,
  Dimensions: dimensions,
  Unit: 'Count',
  Value: value,
});

const getTimeMetricData = (name, statsValues) => ({
  MetricName: name,
  Dimensions: dimensions,
  Unit: 'Milliseconds',
  StatisticValues: statsValues,
});


const getCountMetricDatum = () => {
  const keys = Object.keys(countMetrics);
  if (keys.length === 0) return [];

  const metricDatum = keys.map(key => getCountMetricData(key, countMetrics[key]));
  countMetrics = {}; // zero out the recorded count metrics
  return metricDatum;
};

const getTimeMetricDatum = () => {
  const keys = Object.keys(timeMetrics);
  if (keys.length === 0) {
    return [];
  }

  const metricDatum = keys.map(key => getTimeMetricData(key, timeMetrics[key]));
  timeMetrics = {}; // zero out the recorded time metrics
  return metricDatum;
};

export const flush = async () => {
  const countDatum = getCountMetricDatum();
  const timeDatum = getTimeMetricDatum();
  const allDatum = countDatum.concat(timeDatum);

  if (allDatum.length === 0) { return; }

  const metricNames = allDatum.map(x => x.MetricName).join(',');
  log.debug(`flushing [${allDatum.length}] metrics to CloudWatch: ${metricNames}`);

  const params = {
    MetricData: allDatum,
    Namespace: namespace,
  };

  try {
    await cloudwatch.putMetricData(params).promise();
    log.debug(`flushed [${allDatum.length}] metrics to CloudWatch: ${metricNames}`);
  } catch (err) {
    log.warn(`cloudn't flush [${allDatum.length}] CloudWatch metrics`, null, err);
  }
};

export const clear = () => {
  countMetrics = {};
  timeMetrics = {};
};

export const incrCount = (metricName, count) => {
  const internalCount = count || 1;
  // If under the async mode, use console.log to send a formated data to CloudWatch
  // The format is MONITORING|value|unit|name|namespace|dimensions1, dimension2, ...
  if (isAsyncMode) console.log(`MONITORING|${internalCount}|count|${metricName}|${namespace}`);
  else if (countMetrics[metricName]) {
    countMetrics[metricName] += internalCount;
  } else {
    countMetrics[metricName] = internalCount;
  }
};

export const recordTimeInMillis = (metricName, ms) => {
  if (!ms && ms !== 0) {
    return;
  }

  log.debug(`new execution time for [${metricName}] : ${ms} milliseconds`);

  if (isAsyncMode) console.log(`MONITORING|${ms}|milliseconds|${metricName}|${namespace}`);
  else if (timeMetrics[metricName]) {
    const metric = timeMetrics[metricName];
    metric.Sum += ms;
    metric.Maximum = Math.max(metric.Maximum, ms);
    metric.Minimum = Math.min(metric.Minimum, ms);
    metric.SampleCount += 1;
  } else {
    const statsValues = {
      Maximum: ms,
      Minimum: ms,
      SampleCount: 1,
      Sum: ms,
    };
    timeMetrics[metricName] = statsValues;
  }
};

export const trackExecTime = (metricName, f) => {
  if (!f || typeof f !== 'function') {
    throw new Error('cloudWatch.trackExecTime requires a function, eg. () => 42');
  }

  if (!metricName) {
    throw new Error('cloudWatch.trackExecTime requires a metric name, eg. "CloudSearch-latency"');
  }

  const start = new Date().getTime();
  let end;
  const res = f();
  // anything with a 'then' function can be considered a Promise...
  // http://stackoverflow.com/a/27746324/55074
  if (!Object.prototype.hasOwnProperty.call(res, 'then')) {
    end = new Date().getTime();
    recordTimeInMillis(metricName, end - start);
    return res;
  }
  return res.then(x => {
    end = new Date().getTime();
    recordTimeInMillis(metricName, end - start);
    return x;
  });
};
