# CloudWatch

A library to help collect and flush metrics with async mode or flush as a bundle in the end of the function invacation.
For the non user facing functions, we can use sync mode to put metrics to the CloudWatch as a bundle via call flush method in the end of the invacation.
For user facing functions, set the async_metrics to true in the process.env which allow the library to use console.log to log metrics with async mode. (Another Lambda function will be triggerred by the log file and decode the console.log message)

name_space can be set up in the process.env. Otherwise, the AWS_LAMBDA_LOG_GROUP_NAME will be use as the default name sapce.

[![Build Status](https://travis-ci.org/PengWang0316/CloudWatch.svg?branch=master)](https://travis-ci.org/PengWang0316/CloudWatch)
[![Coverage Status](https://coveralls.io/repos/github/PengWang0316/CloudWatch/badge.svg?branch=master)](https://coveralls.io/github/PengWang0316/CloudWatch?branch=master)

# Dependencies requirement

Due to this library is a wrapper of AWS and AWSXray, these two packages are required.
(Lambda will include AWS package by default.)
Please check your package.json file.

- AWSXRay (Need to be installed by users)
- AWS (Lambda has already had this)

# Installing

```
npm install --save @kevinwang0316/cloudwatch aws-xray-sdk
```

# Usage

```javascript
// For NodeJS
const cloudwatch = require('@kevinwang0316/cloudwatch');

// Track execution time
await cloudwatch.trackExecTime('MongoDbUpdateLatancy', () => { /* could be sync code or a promise */ });

// Record time individually
cloudwatch.recordTimeInMillis('metric name', 100);

// Record invocation count
cloudwatch.incrCount('metric name', 2);

// Clear all metrics
cloudwatch.clear();

// Flush before the invocation. The best practice is to use a middleware call the flush method
cloudwatch.flush();
```


# Log Configuration

The [@kevinwang0316/log](https://www.npmjs.com/package/@kevinwang0316/log) library is using

If you want to change the defual log level (debug):

Add a log_level variable to your .env file.
Or if you are using Fass solution such as AWS Lambda, set up the log_level to your environment.

Log all level of information (debug, info, warn, error)
log_level=DEBUG

Log info and above levels of information (info, warn, error)
log_level=INFO

Log warn and above levels of information (warn, error)
log_level=WARN

Log just error level of information (error)
log_level=ERROR

# License

Log is licensed under MIT License - see the [License file](https://github.com/PengWang0316/VerifyJWT/blob/master/LICENSE).
