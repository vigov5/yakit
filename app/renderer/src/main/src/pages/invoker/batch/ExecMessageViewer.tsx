import React from "react";
import {ExecResult} from "../schema";
import {Alert, Button, Card, Progress, Space, Tag, Timeline, Typography} from "antd";
import {YakitLogFormatter} from "../YakitLogFormatter";
import {formatTime, formatTimestamp} from "../../../utils/timeUtil";
import {LogLevelToCode} from "../../../components/HTTPFlowTable/HTTPFlowTable";
import {showModal} from "../../../utils/showModal";
import {Header} from "antd/es/layout/layout";
import {useMemoizedFn} from "ahooks";
import i18next from "../../../i18n"

const {Text} = Typography;

export interface ExecResultsViewerProp {
    oneLine?: boolean
    results: ExecResult[]
}

export interface ExecResultMessage {
    type: "log" | "progress" | string
    content: ExecResultLog | ExecResultProgress
}

export interface ExecResultLog {
    level: string
    data: string | any
    timestamp: number
}

export interface ExecResultProgress {
    progress: number
    id: string
}

export const ExecResultsViewer: React.FC<ExecResultsViewerProp> = (props) => {
    const messages: ExecResultMessage[] = [];
    props.results.forEach(e => {
        if (!e.IsMessage) {
            return
        }

        try {
            const raw = e.Message
            const obj: ExecResultMessage = JSON.parse(Buffer.from(raw).toString("utf8"))
            messages.push(obj);
        } catch (e) {
            console.error(e)
        }
    })

    // 处理日志并排序
    const logs: ExecResultLog[] = messages.filter(e => e.type === "log")
        .map(i => {
            return i.content
        })
        .sort((a: any, b: any) => a.timestamp - b.timestamp) as ExecResultLog[];
    const haveCriticalResult = logs.filter(i => ["json", "success"].includes((i?.level || "").toLowerCase())).length > 0;

    // 处理进度
    const progressTable = new Map<string, number>();
    messages.forEach(e => {
        if (e.type === "progress") {
            const progress = (e.content as ExecResultProgress);
            let percent = progressTable.get(progress.id)
            if (!percent) {
                progressTable.set(progress.id, progress.progress)
            } else {
                progressTable.set(progress.id, Math.max(percent, progress.progress))
            }
        }
    })

    const full = useMemoizedFn(() => {
        let progressBars: { id: string, node: React.ReactNode }[] = [];
        progressTable.forEach((v, k) => {
            progressBars.push({
                id: k, node: <Card size={"small"} hoverable={false} bordered={true} title={i18next.t("任务进度ID：${k}", { v1: k })}>
                    <Progress percent={parseInt((v * 100).toFixed(0))} status="active"/>
                </Card>,
            })
        })
        progressBars = progressBars.sort((a, b) => a.id.localeCompare(b.id));

        return <Space direction={"vertical"} style={{width: "100%"}}>
            {haveCriticalResult && <Alert
                style={{marginBottom: 8}}
                type={"success"}
                message={<div>{i18next.t("ATTENTION: 本 PoC 输出相对关键的信息 / There is something important from current PoC.")}
                </div>}
            />}
            {progressBars.map(i => i.node)}
            <Timeline pending={true}>
                {(logs || []).sort().map((e, index) => {
                    return <Timeline.Item key={index} color={LogLevelToCode(e.level)}>
                        <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp}/>
                    </Timeline.Item>
                })}
            </Timeline>
        </Space>
    })

    if (props.oneLine) {
        let progressOneLine: { id: string, node: React.ReactNode }[] = [];
        progressTable.forEach((v, k) => {
            progressOneLine.push({
                id: k, node: <Tag>{k}: {(v * 100).toString(0)}%</Tag>,
            })
        })
        progressOneLine = progressOneLine.sort((a, b) => a.id.localeCompare(b.id));
        const latestLogData = logs[logs.length - 1];
        const latestLog = logs.length > 0 && latestLogData && <Space>
            <Tag
                color={LogLevelToCode(latestLogData.level)}
            >{formatTime(latestLogData?.timestamp)}: {(latestLogData.level).toUpperCase()}</Tag>
            <Text style={{maxWidth: 1200}} ellipsis={{tooltip: true}} copyable={true}>{latestLogData.data}</Text>
        </Space>
        return <Card hoverable={true} bodyStyle={{
            padding: 6, margin: 0,
        }} bordered={false} onClick={e => {
            showModal({
                width: "75%",
                title: i18next.t("任务进度详情"),
                content: <>
                    {full()}
                </>
            })
        }}>
            <Space>
                {haveCriticalResult ? <Tag color={"red"}>HIT</Tag> : <Tag color={"gray"}>{i18next.t("暂无结果")}</Tag>}
                {progressTable.size > 0 ? <Space>
                    {progressOneLine.map(i => i.node)}
                </Space> : undefined}
                {logs.length > 0 ? <>
                    {latestLog}
                </> : undefined}
            </Space>
        </Card>
    }
    return <>{full()}</>;
};