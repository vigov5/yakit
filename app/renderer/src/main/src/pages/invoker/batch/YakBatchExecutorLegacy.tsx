import React, {useEffect, useState} from "react";
import {
    Button,
    Divider,
    Form,
    Input,
    Modal,
    PageHeader,
    Popconfirm,
    Row,
    Space,
    Spin,
    Table,
    Tag,
    Typography
} from "antd";
import {InputInteger} from "../../../utils/inputUtil";
import {YakScriptOperator} from "../YakScriptManager";
import {randomString} from "../../../utils/randomUtil";
import {ExecResult, YakScript} from "../schema";
import {info} from "../../../utils/notification";
import {ExecResultsViewer} from "./ExecMessageViewer";
import {showModal} from "../../../utils/showModal";
import {YakEditor} from "../../../utils/editors";
import i18next from "../../../i18n"

const {ipcRenderer} = window.require("electron");

const {Text} = Typography;

export interface YakBatchExecutorProp {
    keyword: string
    verbose?: string
}

/*
* message ExecBatchYakScriptRequest {
  string Target = 1;
  string Keyword = 2;
  int64 Limit = 3;
  int64 TotalTimeoutSeconds = 4;
  // 模块类型，默认为 nuclei
  string Type = 5;
  // 并发
  int64 Concurrent = 6;
}
* */

export interface ExecBatchYakScriptParams {
    Target: string
    Keyword: string
    Limit: number
    TotalTimeoutSeconds: number
    Type: "yak" | "nuclei" | string
    Concurrent: number
    DisableNucleiWorkflow?: boolean
    ExcludedYakScript?: string[]
}

export interface ExecBatchYakScriptResult {
    Id: string
    Status: string
    Ok?: boolean
    Reason?: string
    PoC: YakScript
    Result?: ExecResult

    ProgressMessage?: boolean
    ProgressPercent?: number
    ProgressTotal?: number
    ProgressCount?: number
    ProgressRunning?: number
    ScanTaskExecutingCount?: number

    TaskId?: string
    ExtraParams?: { Key: string, Value: string }[]
    Target?: string

    Timestamp: number
}

export interface ExecBatchYakScriptTask {
    progress: number
    Id: string
    Status: string
    Ok?: boolean
    Reason?: string
    PoC: YakScript,
    Results: ExecResult[]
}

export const YakBatchExecutorLegacy: React.FC<YakBatchExecutorProp> = (props) => {
    const [params, setParams] = useState<ExecBatchYakScriptParams>({
        Concurrent: 5,
        Keyword: props.keyword,
        DisableNucleiWorkflow: true,
        Limit: 100,
        Target: "",
        TotalTimeoutSeconds: 180,
        Type: "nuclei"
    });
    const [totalLoading, setTotalLoading] = useState(true);
    const [tasks, setTasks] = useState<ExecBatchYakScriptTask[]>([]);
    const [error, setError] = useState("");
    const [token, setToken] = useState("");
    const [executing, setExecuting] = useState(false);

    useEffect(() => {
        setTotalLoading(true)
        setTimeout(() => setTotalLoading(false), 500)

        const token = randomString(40);
        setToken(token);
        setTasks([]);
        setParams({...params, Keyword: props.keyword, Target: ""})
        const tempTasks = new Map<string, ExecBatchYakScriptTask>();
        const updateTasks = () => {
            let items: ExecBatchYakScriptTask[] = [];
            tempTasks.forEach((v, k) => {
                items.push(v)
            })
            setTasks(items.sort((a, b) => b.Id.localeCompare(a.Id)))
        }
        const dataChannel = `${token}-exec-batch-yak-script-data`;
        const errorChannel = `${token}-exec-batch-yak-script-error`;
        const endChannel = `${token}-exec-batch-yak-script-end`;

        let updateTableTick = setInterval(updateTasks, 1000);
        ipcRenderer.on(dataChannel, async (e: any, data: ExecBatchYakScriptResult) => {
            if (data.ProgressMessage) {
                return
            }

            let element = tempTasks.get(data.Id);
            if (element === undefined) {
                tempTasks.set(data.Id, {
                    Id: data.Id,
                    PoC: data.PoC,
                    Results: [],
                    Status: data.Status,
                    progress: 0,
                })
                // updateTasks()
                return
            } else {
                element.Status = data.Status

                if (!element.Ok) {
                    element.Ok = data.Ok || false
                }
                element.Reason = data.Reason

                if (data.Result) {
                    element.Results.push({...data.Result})
                }
                // updateTasks()
                return
            }
        })
        ipcRenderer.on(errorChannel, (e: any, error: any) => {
            setError(error)
        })
        ipcRenderer.on(endChannel, (e: any, data: any) => {
            info(i18next.t("模块加载完成 / 执行完毕"))
            setExecuting(false)
            updateTasks()
        })
        ipcRenderer.invoke("exec-batch-yak-script", {...params, Keyword: props.keyword, Target: ""}, token)
        setExecuting(true)
        return () => {
            clearInterval(updateTableTick);
            ipcRenderer.invoke("cancel-exec-batch-yak-script", token)
            ipcRenderer.removeAllListeners(dataChannel)
            ipcRenderer.removeAllListeners(errorChannel)
            ipcRenderer.removeAllListeners(endChannel)
        }
    }, [props.keyword])

    if (totalLoading) {
        return <div style={{textAlign: "center", width: "100%", marginTop: 100}}>
            <Spin>{i18next.t("正在加载专用漏洞库")}</Spin>
        </div>
    }

    return <div>
        <PageHeader
            title={i18next.t("漏洞与风险监测专题") + `：${props.verbose ? props.verbose : props.keyword}`}
            style={{width: "100%"}}
        >
            <div style={{textAlign: "center", width: "100%"}}>
                <Form style={{
                    textAlign: "center",
                }} onSubmitCapture={e => {
                    e.preventDefault()

                    if (!params.Target) {
                        Modal.error({title: i18next.t("检测目标不能为空")})
                        return
                    }

                    if (!params.Keyword) {
                        Modal.error({title: i18next.t("无 PoC 关键字选择")})
                        return
                    }

                    if (!token) {
                        Modal.error({title: i18next.t("BUG：无 Token 生成，请重新打开该页")})
                    }

                    ipcRenderer.invoke("exec-batch-yak-script", params, token)
                    setExecuting(true)
                }}>
                    <Space direction={"vertical"}>
                        <Space>
                            <span>{i18next.t("输入想要检测的目标：")}</span>
                            <Form.Item
                                style={{marginBottom: 0}}
                            >
                                <Input
                                    style={{width: 600}}
                                    value={params.Target}
                                    onChange={e => {
                                        setParams({...params, Target: e.target.value})
                                    }}
                                    suffix={<Space>
                                        {!executing ? <Button style={{width: 120}} type="primary"
                                                              htmlType="submit"
                                        >{i18next.t("开始检测")} </Button> : <Popconfirm
                                            title={i18next.t("确定要停止该漏洞检测？")}
                                            onConfirm={e => {
                                                ipcRenderer.invoke("cancel-exec-batch-yak-script", token)
                                            }}
                                        >
                                            <Button style={{width: 120}} danger={true}>{i18next.t("强制停止")} </Button>
                                        </Popconfirm>}
                                    </Space>}
                                />
                            </Form.Item>
                            <Button type={"link"} style={{margin: 0, paddingLeft: 0}} onClick={e => {
                                showModal({
                                    title: i18next.t("设置批量检测额外参数"),
                                    content: <>
                                        <Form
                                            onSubmitCapture={e => e.preventDefault()}
                                            labelCol={{span: 7}} wrapperCol={{span: 14}}>
                                            <InputInteger
                                                label={"并发量(线程)"}
                                                setValue={Concurrent => setParams({...params, Concurrent})}
                                                defaultValue={params.Concurrent}
                                            />
                                            <InputInteger
                                                label={i18next.t("限制模块数量")}
                                                setValue={Limit => setParams({...params, Limit})}
                                                defaultValue={params.Limit}
                                            />
                                            <InputInteger
                                                label={i18next.t("总超时时间/s")}
                                                setValue={TotalTimeoutSeconds => setParams({
                                                    ...params,
                                                    TotalTimeoutSeconds
                                                })}
                                                defaultValue={params.TotalTimeoutSeconds}
                                            />
                                        </Form>
                                    </>
                                })
                            }}>{i18next.t("额外参数")}</Button>
                        </Space>
                        <div style={{width: "100%", textAlign: "right"}}>
                            <Space direction={"vertical"}>
                                <Space>
                                    <Tag>{i18next.t("并发/线程:")} {params.Concurrent}</Tag>
                                    <Tag>{i18next.t("总超时:")} {params.TotalTimeoutSeconds} sec</Tag>
                                    <Tag>{i18next.t("限制模块最大数:")} {params.Limit}</Tag>
                                    <p style={{color: "#999", marginBottom: 0}}>{i18next.t("可接受输入为：URL / IP / 域名 / 主机:端口")}
                                    </p>
                                    <div style={{width: 80}}/>
                                </Space>
                            </Space>
                        </div>
                    </Space>
                </Form>
            </div>
        </PageHeader>
        <Divider/>
        <Row gutter={12} style={{height: "100%"}}>
            <div
                style={{
                    width: "100%", textAlign: "center",
                    marginLeft: 20, marginRight: 20,
                    marginBottom: 100,
                }}
            >
                <Table<ExecBatchYakScriptTask>
                    pagination={false}
                    dataSource={tasks}
                    bordered={true} size={"small"}
                    rowKey={(row) => {
                        return row.Id
                    }}
                    columns={[
                        {
                            title: i18next.t("模块名称"),
                            width: 400,
                            render: (i: ExecBatchYakScriptTask) => <div style={{overflow: "auto", width: 400}}>
                                <Text
                                    ellipsis={{tooltip: true}} copyable={true} style={{width: 300}}
                                >{i.Id}</Text>
                            </div>
                        },
                        {
                            title: i18next.t("模块状态"), width: 150,
                            render: (i: ExecBatchYakScriptTask) => StatusToVerboseTag(i.Status)
                        },
                        {
                            title: i18next.t("执行过程预览"), render: (i: ExecBatchYakScriptTask) => {
                                return <ExecResultsViewer results={i.Results} oneLine={true}/>
                            }
                        },
                        {
                            title: i18next.t("操作"),
                            render: (i: ExecBatchYakScriptTask) => <div>
                                <Space>
                                    <Button
                                        type={"primary"} size={"small"}
                                        onClick={e => {
                                            if (!i.PoC) {
                                                Modal.error({title: i18next.t("没有模块信息")})
                                                return
                                            }
                                            showModal({
                                                title: i18next.t("单体模块测试")+`: ${i.PoC.ScriptName}`,
                                                width: "75%",
                                                content: <>
                                                    <YakScriptOperator script={i.PoC}/>
                                                </>
                                            })
                                        }}
                                    >{i18next.t("单独检测")}</Button>
                                    <Button
                                        size={"small"}
                                        onClick={e => {
                                            if (!i.PoC) {
                                                Modal.error({title: i18next.t("没有模块信息")})
                                                return
                                            }
                                            showModal({
                                                title: i18next.t("源码")+`: ${i.PoC.ScriptName}`,
                                                width: "75%",
                                                content: <>
                                                    <div style={{height: 400}}>
                                                        <YakEditor
                                                            readOnly={true} type={"yaml"} value={i.PoC.Content}
                                                        />
                                                    </div>
                                                </>
                                            })
                                        }}
                                    >{i18next.t("源码")}</Button>
                                    <Button type={"primary"} size={"small"} disabled={true}>{i18next.t("待开发...")}</Button>
                                </Space>
                            </div>
                        },
                    ]}
                >

                </Table>
            </div>
        </Row>
    </div>
};

export const StatusToVerboseTag = (status: string) => {
    switch (status.toLowerCase()) {
        case "waiting":
            return <Tag color={"geekblue"}>{i18next.t("等待执行")}</Tag>
        case "data":
        case "executing":
        case "running":
            return <Tag color={"orange"}>{i18next.t("正在执行")}</Tag>
        case "end":
            return <Tag color={"green"}>{i18next.t("执行结束")}</Tag>
        default:
            return <Tag color={"blue"}>{status}</Tag>
    }
}