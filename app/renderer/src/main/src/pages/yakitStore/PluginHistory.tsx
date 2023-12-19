import React, {useEffect, useState} from "react";
import {Button, Space, Table, Tag} from "antd";
import {
    ExecHistoryRecord,
    genDefaultPagination,
    QueryGeneralRequest,
    QueryGeneralResponse,
    YakScript
} from "../invoker/schema";
import {failed} from "../../utils/notification";
import {formatTimestamp} from "../../utils/timeUtil";
import {CopyableField} from "../../utils/inputUtil";
import {showModal} from "../../utils/showModal";
import {YakEditor} from "../../utils/editors";
import {ReloadOutlined} from "@ant-design/icons";
import i18next from "../../i18n"

export interface PluginHistoryTableProp {
    trigger?: any
    script: YakScript,
}

interface QueryPluginHistoryParams extends QueryGeneralRequest {
    YakScriptId?: number
    YakScriptName?: string
}

const {ipcRenderer} = window.require("electron");

export const PluginHistoryTable: React.FC<PluginHistoryTableProp> = (props) => {
    const [params, setParams] = useState<QueryPluginHistoryParams>({
        Pagination: genDefaultPagination(10),
    });
    const [response, setResponse] = useState<QueryGeneralResponse<ExecHistoryRecord>>({
        Data: [],
        Pagination: genDefaultPagination(10),
        Total: 0
    })
    const [loading, setLoading] = useState(false);

    const update = (page?: number, limit?: number,) => {
        const newParams = {
            ...params,
            YakScriptId: props.script.Id,
            YakScriptName: props.script.ScriptName,
        }
        if (page) newParams.Pagination.Page = page;
        if (limit) newParams.Pagination.Limit = limit;

        setLoading(true)
        ipcRenderer.invoke("QueryExecHistory", newParams).then(data => {
            setResponse(data)
        }).catch((e: any) => {
            failed("QueryExecHistory failed: " + `${e}`)
        }).finally(() => {
            setTimeout(() => setLoading(false), 200)
        })
    }

    useEffect(() => {
        update(1)
    }, [props.trigger])

    return <div>
        <Table<ExecHistoryRecord>
            size={"small"}
            title={() => {
                return <Space>
                    <div>{props.script.ScriptName} 的执行历史记录</div>
                    <Button type={"link"} ghost={true} onClick={() => {
                        update()
                    }}><ReloadOutlined/> </Button>
                </Space>
            }}
            loading={loading}
            rowKey={(row)=>{return row.Timestamp}}
            dataSource={response.Data}
            pagination={{
                pageSize: response.Pagination.Limit,
                showSizeChanger: true,
                total: response.Total,
                pageSizeOptions: ["5", "10", "20"],
                onChange: update,
            }}
            scroll={{x: "auto"}}
            columns={[
                {
                    title: i18next.t("执行时间"),
                    render: (i: ExecHistoryRecord) => <Tag>{formatTimestamp(i.Timestamp)}</Tag>,
                    width: 130,
                },
                {
                    title: i18next.t("耗时"),
                    render: (r: ExecHistoryRecord) => <Tag color={"geekblue"}>{r.DurationMs}ms</Tag>,
                    width: 100,
                },
                {
                    title: i18next.t("参数"), width: 300,
                    render: (r: ExecHistoryRecord) => <CopyableField noCopy={!r.Params} text={r.Params} width={300}/>,
                },
                {
                    title: i18next.t("状态"), width: 120,
                    render: (r: ExecHistoryRecord) => r.Ok ? <Tag color={"green"}>{i18next.t("执行成功")}</Tag> :
                        <Tag color={"red"}>{i18next.t("执行失败")}</Tag>
                },
                {
                    title: i18next.t("执行结果/失败原因"), render: (r: ExecHistoryRecord) => r.Ok ? <Space>
                        {r.Stdout && <Tag color={"geekblue"}>{i18next.t("标准输出内容长度")}[{(r.StdoutLen)}]</Tag>}
                        {r.Stderr && <Tag color={"orange"}>{i18next.t("标准错误内容长度")}[{(r.StderrLen)}]</Tag>}
                        {!r.Stdout && !r.Stderr ? <Tag>{i18next.t("无输出")}</Tag> : undefined}
                    </Space> : <Space>
                        <Tag color={"red"}>{r.Reason}</Tag>
                    </Space>
                },
                {
                    title: i18next.t("操作"), render: (r: ExecHistoryRecord) => <Space>
                        <Button size={"small"} onClick={() => {
                            showModal({
                                title: i18next.t("插件源码"), content: <>
                                    <div style={{height: 500}}>
                                        <YakEditor type={ props.script.Type} readOnly={true} value={props.script.Content}/>
                                    </div>
                                </>, width: "60%",
                            })
                        }}>{i18next.t("插件源码")}</Button>
                    </Space>
                },
            ]}
        >

        </Table>
    </div>
};