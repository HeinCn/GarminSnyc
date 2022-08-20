import fs from 'fs';
import core from '@actions/core';
import {
    GARMIN_MIGRATE_NUM_DEFAULT,
    GARMIN_MIGRATE_START_DEFAULT,
    GARMIN_PASSWORD_DEFAULT,
    GARMIN_URL_DEFAULT,
    GARMIN_USERNAME_DEFAULT,
} from '../constant';
import { GarminClientType } from './type';
import _ from 'lodash';

const unzipper = require('unzipper');

export const downloadDir = './garmin_fit_files';

/**
 * 上传 .fit file
 * @param fitFilePath
 * @param client
 */
export const uploadGarminActivity = async (fitFilePath: string, client: GarminClientType): Promise<void> => {
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir);
    }
    const upload = await client.uploadActivity(fitFilePath);
    console.log('upload to garmin activity', upload);
};

/**
 * 下载 garmin 活动原始数据，并解压保存到本地
 * @param activityId
 * @param client GarminClientType
 */
export const downloadGarminActivity = async (activityId, client: GarminClientType): Promise<string> => {
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir);
    }

// Use the id as a parameter
    const activity = await client.getActivity({ activityId: activityId });
    await client.downloadOriginalActivityData(activity, downloadDir);
    // console.log('userInfo', userInfo);
    const originZipFile = downloadDir + '/' + activityId + '.zip';
    await fs.createReadStream(originZipFile)
        .pipe(unzipper.Extract({ path: downloadDir }));
    // waiting 4s for extract zip file
    await new Promise(resolve => setTimeout(resolve, 4000));
    const fitFilePath = `${downloadDir}/${activityId}_ACTIVITY.fit`;
    const gpxFilePath = `${downloadDir}/${activityId}_ACTIVITY.gpx`;
    try {
        if (fs.existsSync(fitFilePath)) {
            console.log('saved fitFilePath', fitFilePath);
            //file exists
            return fitFilePath;
        } else if (fs.existsSync(gpxFilePath)) {
            console.log('saved gpxFilePath', gpxFilePath);
            //file exists
            return gpxFilePath;
        } else {
            const existFiles = fs.readdirSync(downloadDir, { withFileTypes: true })
                .filter(item => !item.isDirectory())
                .map(item => item.name);
            console.log('fitFilePath', fitFilePath);
            console.log('fitFilePath not exist, curr existFiles', existFiles);
            core.setFailed('file not exist ' + fitFilePath);
            return Promise.reject('file not exist ' + fitFilePath);
        }
    } catch (err) {
        console.error(err);
        core.setFailed(err);
    }
    return fitFilePath;
};

export const getGarminStatistics = async (client: GarminClientType): Promise<Record<string, any>> => {
    // Get a list of default length with most recent activities
    const acts = await client.getActivities(0, 10);
    // console.log('acts', acts);
    const recentRunningAct = _.filter(acts, { activityType: { typeKey: 'running' } })[0];
    // console.log('recentRunningAct', recentRunningAct);

    const {
        activityId, // 活动id
        activityName, // 活动名称
        startTimeLocal, // 活动开始时间
        distance, // 距离
        duration, // 时间
        averageSpeed, // 平均速度 m/s
        averageHR, // 平均心率
        maxHR, // 最大心率
        averageRunningCadenceInStepsPerMinute, // 平均每分钟步频
        aerobicTrainingEffect, // 有氧效果
        anaerobicTrainingEffect, // 无氧效果
        avgGroundContactTime, // 触地时间
        avgStrideLength, // 步幅
        vO2MaxValue, // VO2Max
        avgVerticalOscillation, // 垂直振幅
        avgVerticalRatio, // 垂直振幅比
        avgGroundContactBalance, // 触地平衡
        trainingEffectLabel, // 训练效果
        activityTrainingLoad, // 训练负荷
    } = recentRunningAct;

    const pace = 1 / (averageSpeed / 1000 * 60);
    const pace_min = Math.floor(1 / (averageSpeed / 1000 * 60));
    const pace_second = (pace - pace_min) * 60;
    // console.log('pace', pace);
    // console.log('pace_min', pace_min);
    // console.log('pace_second', pace_second);

    return {
        activityId, // 活动id
        activityName, // 活动名称
        startTimeLocal, // 活动开始时间
        distance, // 距离
        duration, // 持续时间
        // averageSpeed 是 m/s
        averageSpeed, // 速度
        averagePace: pace,  // min/km
        averagePaceText: `${pace_min}:${pace_second.toFixed(0)}`,  // min/km
        averageHR, // 平均心率
        maxHR, // 最大心率
        averageRunningCadenceInStepsPerMinute, // 平均每分钟步频
        aerobicTrainingEffect, // 有氧效果
        anaerobicTrainingEffect, // 无氧效果
        avgGroundContactTime, // 触地时间
        avgStrideLength, // 步幅
        vO2MaxValue, // 最大摄氧量
        avgVerticalOscillation, // 垂直振幅
        avgVerticalRatio, // 垂直振幅比
        avgGroundContactBalance, // 触地平衡
        trainingEffectLabel, // 训练效果
        activityTrainingLoad, // 训练负荷
        activityURL: GARMIN_URL_DEFAULT.ACTIVITY_URL + activityId, // 活动链接
    };
    // const detail = await GCClient.getActivity(recentRunningAct);
    // console.log('detail', detail);
};
