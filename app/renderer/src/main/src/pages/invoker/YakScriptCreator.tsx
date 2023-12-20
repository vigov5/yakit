import React, {useEffect, useRef, useState} from "react"
import {Button, Checkbox, Form, Input, List, Popconfirm, Row, Space, Tag, Tooltip, Radio, Modal} from "antd"
import {InputItem, ManyMultiSelectForString, ManySelectOne, SelectOne, SwitchItem} from "../../utils/inputUtil"
import {QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "./schema"
import {YakCodeEditor, YakEditor} from "../../utils/editors"
import {PlusOutlined, QuestionCircleOutlined, ExclamationCircleOutlined} from "@ant-design/icons"
import {showDrawer, showModal} from "../../utils/showModal"
import {failed, info, success, warn} from "../../utils/notification"
import {YakScriptParamsSetter} from "./YakScriptParamsSetter"
import {YakScriptRunner} from "./ExecYakScript"
import {FullscreenOutlined, DeleteOutlined} from "@ant-design/icons"
import {MITMPluginTemplate} from "./data/MITMPluginTamplate"
import {PacketHackPluginTemplate} from "./data/PacketHackPluginTemplate"
import {CodecPluginTemplate, CustomDnsLogPlatformTemplate, NucleiYamlTemplate, YakTemplate} from "./data/CodecPluginTemplate"
import {PortScanPluginTemplate} from "./data/PortScanPluginTemplate"
import {useCreation, useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import "./YakScriptCreator.scss"
import {queryYakScriptList} from "../yakitStore/network"
import {YakExecutorParam} from "./YakExecutorParams"
import {
    onLocalScriptToOnlinePlugin,
    SyncCloudButton,
    SyncCopyCloudButton
} from "@/components/SyncCloudButton/SyncCloudButton"
import {useStore} from "@/store"
import {API} from "@/services/swagger/resposeType"
import {NetWorkApi} from "@/services/fetch"
import {SearchPluginDetailRequest} from "../yakitStore/YakitPluginInfoOnline/YakitPluginInfoOnline"
import {useSubscribeClose} from "@/store/tabSubscribe"
import { YakitRoute } from "@/routes/newRoute"
import { addTag, removeTag } from "../customizeMenu/utils"
import { YakParamProps } from "../plugins/pluginsType"
import i18next from "../../i18n"

export const BUILDIN_PARAM_NAME_YAKIT_PLUGIN_NAMES = "__yakit_plugin_names__"

export interface YakScriptCreatorFormProp {
    onCreated?: (i: YakScript) => any
    modified?: YakScript
    onChanged?: (i: YakScript) => any
    fromLayout?: FromLayoutProps
    noClose?: boolean
    showButton?: boolean
    setScript?: (i: YakScript) => any
    /** 是否是新建插件 */
    isCreate?: boolean
    moduleType?: string
    content?: string
}

/*
*                            {value: "yak", text: i18next.t("Yak 原生模块")},
                           {value: "mitm", text: i18next.t("MITM 模块")},
                           {value: "packet-hack", text: i18next.t("Packet 检查")},
                           {value: "port-scan", text: i18next.t("端口扫描插件")},
                           {value: "codec", text: i18next.t("Codec 模块")},
                           {value: "nuclei", text: i18next.t("nuclei Yaml模块")},
* */
export const getPluginTypeVerbose = (t: "yak" | "mitm" | "port-scan" | "nuclei" | "codec" | "packet-hack" | string) => {
    switch (t) {
        case "nuclei":
            return i18next.t("Nuclei Yaml模块")
        case "yak":
            return i18next.t("Yak 原生模块")
        case "codec":
            return i18next.t("Codec 编码模块")
        case "mitm":
            return i18next.t("MITM 插件")
        case "port-scan":
            return i18next.t("端口扫描插件")
        default:
            return i18next.t("未知类型")
    }
}

const {ipcRenderer} = window.require("electron")

export const executeYakScriptByParams = (data: YakScript, saveDebugParams?: boolean) => {
    const yakScriptParams: YakScript = cloneDeep(data)
    const exec = (extraParams?: YakExecutorParam[]) => {
        if (yakScriptParams.Params.length <= 0) {
            showModal({
                title: i18next.t("立即执行"),
                width: 1000,
                content: (
                    <>
                        <YakScriptRunner consoleHeight={"200px"} debugMode={true} script={yakScriptParams} params={[...(extraParams || [])]} />
                    </>
                )
            })
        } else {
            let m = showModal({
                title: i18next.t("确认想要执行的参数"),
                width: "70%",
                content: (
                    <>
                        <YakScriptParamsSetter
                            {...yakScriptParams}
                            saveDebugParams={saveDebugParams}
                            onParamsConfirm={(params) => {
                                m.destroy()
                                showModal({
                                    title: i18next.t("立即执行"),
                                    width: 1000,
                                    content: (
                                        <>
                                            <YakScriptRunner
                                                debugMode={true}
                                                script={yakScriptParams}
                                                params={[...params, ...(extraParams || [])]}
                                            />
                                        </>
                                    )
                                })
                            }}
                        />
                    </>
                )
            })
        }
    }
    if (yakScriptParams.EnablePluginSelector) {
        queryYakScriptList(
            yakScriptParams.PluginSelectorTypes || "mitm,port-scan",
            (i) => {
                exec([{Key: BUILDIN_PARAM_NAME_YAKIT_PLUGIN_NAMES, Value: i.map((i) => i.ScriptName).join("|")}])
            },
            undefined,
            10,
            undefined,
            undefined,
            undefined,
            () => {
                exec([{Key: BUILDIN_PARAM_NAME_YAKIT_PLUGIN_NAMES, Value: "no-such-plugin"}])
            }
        )
    } else {
        exec()
    }
}

export interface FromLayoutProps {
    labelCol: object
    wrapperCol: object
}

const defParams = {
    Content: YakTemplate,
    Tags: "",
    Author: "",
    Level: "",
    IsHistory: false,
    IsIgnore: false,
    CreatedAt: 0,
    Help: "",
    Id: 0,
    Params: [],
    ScriptName: "",
    Type: "yak",
    IsGeneralModule: false,
    PluginSelectorTypes: "mitm,port-scan",
    UserId: 0,
    OnlineId: 0,
    OnlineScriptName: "",
    OnlineContributors: "",
    GeneralModuleVerbose: "",
    GeneralModuleKey: "",
    FromGit: "",
    UUID: ""
}

export const YakScriptCreatorForm: React.FC<YakScriptCreatorFormProp> = (props) => {
    const {showButton = true, isCreate, moduleType = "yak", content = YakTemplate} = props
    
    const defFromLayout = useCreation(() => {
        const col: FromLayoutProps = {
            labelCol: {span: 5},
            wrapperCol: {span: 14}
        }
        return col
    }, [])
    const [fromLayout, setFromLayout] = useState<FromLayoutProps>(defFromLayout)
    const [params, setParams, getParams] = useGetState<YakScript>(() => {
        const newDefaultVal = { ...defParams, Type: moduleType, Content: content || YakTemplate }
        return props.modified || newDefaultVal
    })
    const [paramsLoading, setParamsLoading] = useState(false)
    const [modified, setModified] = useState<YakScript | undefined>(props.modified)
    const [fullscreen, setFullscreen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [saveLoading, setSaveLoading] = useState<boolean>(false)
    const [isQueryByYakScriptName, setIsQueryByYakScriptName] = useState<boolean>(false)
    useEffect(() => {
        setIsQueryByYakScriptName(!props.modified)
    }, [])

    const [updateLoading, setUpdateLoading] = useState<boolean>(false)
    const [isByMeCreatOnlienPlugin, setIsByMeCreatOnlienPlugin] = useState<boolean>(true)
    const {userInfo} = useStore()
    const debugButton = (primary?: boolean) => {
        if (loading) {
            return <Button disabled={true}>{i18next.t("执行中...无法调试")}</Button>
        }
        return
    }

    const {setSubscribeClose, removeSubscribeClose} = useSubscribeClose()
    const modalRef = useRef<any>() //存储二次确认框
    useEffect(() => {
        if (getParams().Id > 0) {
            onCloseTab()
            removeSubscribeClose(YakitRoute.AddYakitScript)
            return
        }
        setSubscribeClose(YakitRoute.AddYakitScript, {"close":{
            title: i18next.t("插件未保存"),
            content: i18next.t("是否要保存该插件?"),
            confirmLoading: saveLoading,
            onOk: (m) => {
                modalRef.current = m
                onSaveLocal()
            },
            onCancel: () => {
                onCloseTab()
            }
        }})
        return () => {
            removeSubscribeClose(YakitRoute.AddYakitScript)
        }
    }, [getParams().Id])

    useEffect(() => {
        if (props.fromLayout) {
            setFromLayout(props.fromLayout)
        }
    }, [])

    useEffect(() => {
        if (paramsLoading) {
            setTimeout(() => {
                setParamsLoading(false)
            }, 400)
        }
    }, [paramsLoading])

    useUpdateEffect(() => {
        //创建插件才会有模块类型的修改
        switch (params.Type) {
            case "mitm":
                setParams({...params, Content: MITMPluginTemplate})
                return
            case "port-scan":
                setParams({
                    ...params,
                    Content: PortScanPluginTemplate,
                    Params: [
                        {
                            Field: "target",
                            FieldVerbose: i18next.t("扫描的目标"),
                            TypeVerbose: "string",
                            Required: true,
                            DefaultValue: ""
                        } as YakParamProps,
                        {
                            Field: "ports",
                            FieldVerbose: i18next.t("端口"),
                            TypeVerbose: "string",
                            Required: false,
                            DefaultValue: "80"
                        } as YakParamProps
                    ]
                })
                return
            case "packet-hack":
                setParams({
                    ...params,
                    Content: PacketHackPluginTemplate,
                    Params: [
                        {
                            Field: "request",
                            DefaultValue: "",
                            TypeVerbose: "http-packet",
                            Required: true
                        } as YakParamProps,
                        {
                            Field: "response",
                            DefaultValue: "",
                            TypeVerbose: "http-packet",
                            Required: false
                        } as YakParamProps,
                        {Field: "isHttps", DefaultValue: "", TypeVerbose: "bool"} as YakParamProps
                    ]
                })
                return
            case "codec":
                setParams({...params, Content: CodecPluginTemplate})
                return
            case "nuclei":
                const templateVal = moduleType === "nuclei" ? content : NucleiYamlTemplate
                setParams({...params, Content: templateVal})
                return
            default:
                setParams({...params, Content: YakTemplate})
                return
        }
    }, [params.Type])

    useEffect(() => {
        if (props.modified) {
            setParams({
                ...props.modified
            })
            showButton && getPluginDetail(props.modified?.OnlineId, props.modified?.UUID)
        }
    }, [props.modified, userInfo])
    const getPluginDetail = useMemoizedFn((pluginId, uuid) => {
        if (!userInfo.isLogin) return
        if ((pluginId as number) == 0) return
        NetWorkApi<SearchPluginDetailRequest, API.YakitPluginDetailResponse>({
            method: "get",
            url: "yakit/plugin/detail",
            params: {
                uuid
            }
        })
            .then((res: API.YakitPluginDetailResponse) => {
                if (res.data.user_id === userInfo.user_id) {
                    setIsByMeCreatOnlienPlugin(true)
                } else {
                    setIsByMeCreatOnlienPlugin(false)
                }
            })
            .catch((err) => {
                failed(i18next.t("插件详情获取失败:") + err)
            })
    })
    const onCloseTab = useMemoizedFn(() => {
        ipcRenderer
            .invoke("send-close-tab", {
                router: YakitRoute.AddYakitScript
            })
            .then(() => {})
    })
    // 仅保存本地
    const onSaveLocal = useMemoizedFn(() => {
        if (!params.ScriptName) {
            warn(i18next.t("请输入插件模块名!"))
            return
        }
        if (isQueryByYakScriptName) {
            queryByYakScriptName() // 先查询再保存
        } else {
            onSaveYakScript()
        }
    })

    const onSaveYakScript = useMemoizedFn(() => {
        if (!params.ScriptName) {
            warn(i18next.t("请输入插件模块名!"))
            return
        }
        setSaveLoading(true)
        ipcRenderer
            .invoke("SaveYakScript", params)
            .then((data) => {
                info(i18next.t("创建 / 保存 Yak 脚本成功"))
                setParams(data)
                if (isCreate) {
                    // model提示保存后的处理
                    onCloseTab()
                    ipcRenderer.invoke("send-local-script-list")
                }
                if (modalRef.current) modalRef.current.destroy()
                props.onCreated && props.onCreated(data)
                props.onChanged && props.onChanged(data)
                setTimeout(() => ipcRenderer.invoke("change-main-menu"), 100)
            })
            .catch((e: any) => {
                failed(i18next.t("保存 Yak 模块失败: ${e}", { v1: e }))
            })
            .finally(() => {
                setTimeout(() => {
                    setSaveLoading(false)
                }, 200)
            })
    })

    const queryByYakScriptName = useMemoizedFn(() => {
        if (!params.ScriptName) {
            warn(i18next.t("请输入插件模块名!"))
            return
        }
        const newParams: QueryYakScriptRequest = {
            IncludedScriptNames: [params.ScriptName],
            Pagination: {
                Limit: 1,
                Page: 1,
                Order: "desc",
                OrderBy: "updated_at"
            }
        }
        setSaveLoading(true)
        ipcRenderer
            .invoke("QueryYakScript", newParams)
            .then((item: QueryYakScriptsResponse) => {
                if ((item.Total as number) > 0) {
                    failed(i18next.t("保存 Yak 模块失败：插件名重复"))
                    return
                }
                onSaveYakScript()
            })
            .catch((e: any) => {
                failed("Query Local Yak Script failed: " + `${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setSaveLoading(false)
                }, 200)
            })
    })
    // 修改提交内容
    const onSubmitEditContent = useMemoizedFn(() => {
        if (!userInfo.isLogin) {
            warn(i18next.t("请先登录"))
            return
        }
        Modal.confirm({
            title: i18next.t("提交的内容不会覆盖本地数据！"),
            icon: <ExclamationCircleOutlined />,
            content: (
                <div>
                    <p>{i18next.t("提交的内容只会展示给插件作者看，待审核通过后才会更新在插件商店中。")}</p>
                    <p>{i18next.t("提交的内容不会覆盖本地的代码，如需要保存本地，请先关闭该弹窗，在页面上点击【保存】按钮后，再点击【提交修改内容】")}
                    </p>
                </div>
            ),
            okText: i18next.t("继续提交"),
            cancelText: i18next.t("关闭"),
            onOk() {
                const newParams = onLocalScriptToOnlinePlugin(params)
                const onlineParams: API.ApplyPluginRequest = {
                    ...newParams,
                    id: parseInt(`${params.OnlineId}`)
                }
                setUpdateLoading(true)
                NetWorkApi<API.ApplyPluginRequest, API.ActionSucceeded>({
                    method: "post",
                    url: "apply/update/plugin",
                    data: onlineParams
                })
                    .then((res) => {
                        success(i18next.t("提交成功"))
                    })
                    .catch((err) => {
                        failed(i18next.t("提交失败:") + err)
                    })
                    .finally(() => {
                        setTimeout(() => {
                            setUpdateLoading(false)
                        }, 200)
                    })
            },
            onCancel() {}
        })
    })

    return (
        <div>
            <Form {...fromLayout}>
                <YakScriptFormContent
                    params={params}
                    setParams={setParams}
                    modified={modified}
                    setParamsLoading={setParamsLoading}
                />
                <Form.Item
                    label={i18next.t("源码")}
                    help={
                        <>
                            <Space>
                                <Button
                                    icon={<FullscreenOutlined />}
                                    onClick={() => {
                                        setFullscreen(true)
                                        let m = showDrawer({
                                            title: "Edit Code",
                                            width: "100%",
                                            closable: false,
                                            keyboard: false,
                                            content: (
                                                <>
                                                    <YakScriptLargeEditor
                                                        script={params}
                                                        language={ params.Type}
                                                        onExit={(data) => {
                                                            m.destroy()
                                                            setFullscreen(false)
                                                            ipcRenderer.invoke("QueryYakScript", {})
                                                        }}
                                                        onUpdate={(data: YakScript) => {
                                                            props.onChanged && props.onChanged(data)
                                                            setParams({...data})
                                                        }}
                                                    />
                                                </>
                                            )
                                        })
                                    }}
                                    type={"link"}
                                    style={{
                                        marginBottom: 12,
                                        marginTop: 6
                                    }}
                                >{i18next.t("大屏模式")}
                                </Button>
                                {!["packet-hack", "codec", "nuclei"].includes(params.Type) && (
                                    <Checkbox
                                        name={i18next.t("默认启动")}
                                        style={{
                                            marginBottom: 12,
                                            marginTop: 6
                                        }}
                                        checked={params.IsGeneralModule}
                                        onChange={() =>
                                            setParams({
                                                ...params,
                                                IsGeneralModule: !params.IsGeneralModule
                                            })
                                        }
                                    >{i18next.t("默认启动")}{" "}
                                        <Tooltip
                                            title={
                                                i18next.t("设置默认启动后，将在恰当时候启动该插件(Yak插件不会自动启动，但会自动增加在左侧基础安全工具菜单栏)")
                                            }
                                        >
                                            <Button type={"link"} icon={<QuestionCircleOutlined />} />
                                        </Tooltip>
                                    </Checkbox>
                                )}
                            </Space>
                        </>
                    }
                >
                    {!fullscreen && (
                        <div style={{height: 400}}>
                            <YakEditor
                                type={params.Type}
                                setValue={(Content) => setParams({...getParams(), Content})}
                                value={params.Content}
                            />
                        </div>
                    )}
                </Form.Item>
                <Form.Item colon={false} label={" "}>
                    <Space>
                        <Button type='primary' onClick={onSaveLocal} loading={saveLoading}>{i18next.t("保存")}
                        </Button>
                        {showButton && (
                            <>
                                {(isByMeCreatOnlienPlugin && (
                                    <>
                                        {params?.BaseOnlineId && parseInt(`${params?.BaseOnlineId}`) > 0 && (
                                            <Button onClick={() => onSubmitEditContent()} loading={updateLoading}>{i18next.t("提交修改内容")}
                                            </Button>
                                        )}
                                        <SyncCloudButton
                                            params={params}
                                            setParams={(newSrcipt) => {
                                                setParams(newSrcipt)
                                                props.onCreated && props.onCreated(newSrcipt)
                                                props.onChanged && props.onChanged(newSrcipt)
                                            }}
                                            isCreate={isCreate}
                                        >
                                            <Button>{i18next.t("同步至云端")}</Button>
                                        </SyncCloudButton>
                                    </>
                                )) || (
                                    <>
                                        {/* 判断本地插件是否是私有的 若为私有插件则不显示 复制至云端 按钮 */}
                                        {!params.OnlineIsPrivate && (
                                            <>
                                                <Button onClick={() => onSubmitEditContent()} loading={updateLoading}>{i18next.t("提交修改内容")}
                                                </Button>
                                                <SyncCopyCloudButton
                                                    params={params}
                                                    setParams={(newSrcipt) => {
                                                        setParams(newSrcipt)
                                                        props.onCreated && props.onCreated(newSrcipt)
                                                        props.onChanged && props.onChanged(newSrcipt)
                                                    }}
                                                >
                                                    <Button>{i18next.t("复制至云端")}</Button>
                                                </SyncCopyCloudButton>
                                            </>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        <Button
                            // type={primary ? "primary" : undefined}
                            disabled={[
                                // "mitm",
                                ""
                            ].includes(params.Type)}
                            onClick={() => {
                                setLoading(true)
                                ipcRenderer
                                    .invoke("SaveYakScript", params)
                                    .then((data: YakScript) => {
                                        info(i18next.t("调试前保存插件成功"))
                                        setModified(data)
                                        setParams(data)
                                        if (props.noClose) {
                                            // 不关闭修改这个模块，返回最新数据
                                            props.setScript && props.setScript(data)
                                        } else {
                                            props.onChanged && props.onChanged(data)
                                        }

                                        executeYakScriptByParams(data, true)
                                    })
                                    .catch((e: any) => {
                                        failed(i18next.t("保存 Yak 模块失败: ${e} 无法调试", { v1: e }))
                                    })
                                    .finally(() => {
                                        setTimeout(() => setLoading(false), 400)
                                    })
                            }}
                        >{i18next.t("调试")}
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </div>
    )
}

interface YakScriptFormContentProps {
    params: YakScript
    setParams: (y: YakScript) => void
    modified?: YakScript | undefined
    setParamsLoading?: (b: boolean) => void
    isShowAuthor?: boolean
    disabled?: boolean
}

export const YakScriptFormContent: React.FC<YakScriptFormContentProps> = (props) => {
    const {params, modified, setParams, setParamsLoading, isShowAuthor = true, disabled} = props
    const isNucleiPoC = params.Type === "nuclei"
    return (
        <>
            <SelectOne
                disabled={!!modified}
                label={i18next.t("模块类型")}
                data={[
                    {value: "yak", text: i18next.t("Yak 原生模块")},
                    {value: "mitm", text: i18next.t("MITM 模块")},
                    {value: "packet-hack", text: i18next.t("Packet 检查")},
                    {value: "port-scan", text: i18next.t("端口扫描插件")},
                    {value: "codec", text: i18next.t("Codec 模块")},
                    {value: "nuclei", text: i18next.t("nuclei Yaml模块")}
                ]}
                setValue={(Type) => {
                    if (["packet-hack", "codec", "nuclei"].includes(Type))
                        setParams({
                            ...params,
                            Type,
                            IsGeneralModule: false
                        })
                    else setParams({...params, Type})
                }}
                value={params.Type}
            />
            <InputItem
                label={i18next.t("Yak 模块名")}
                required={true}
                setValue={(ScriptName) => setParams({...params, ScriptName})}
                value={params.ScriptName}
                disable={disabled}
            />
            <InputItem
                label={i18next.t("简要描述")}
                setValue={(Help) => setParams({...params, Help})}
                value={params.Help}
                disable={disabled}
            />
            {isShowAuthor && (
                <InputItem
                    label={i18next.t("模块作者")}
                    setValue={(Author) => setParams({...params, Author})}
                    value={params.Author}
                    disable={disabled}
                />
            )}
            <ManyMultiSelectForString
                label={"Tags"}
                data={[{value: i18next.t("教程"), label: i18next.t("教程")}]}
                mode={"tags"}
                setValue={(Tags) => setParams({...params, Tags})}
                value={params.Tags && params.Tags !== "null" ? params.Tags : ""}
                disabled={disabled}
            />
            {["yak", "mitm"].includes(params.Type) && (
                <Form.Item label={i18next.t("增加参数")}>
                    <Button
                        type={"link"}
                        onClick={() => {
                            if (disabled) return
                            let m = showModal({
                                title: i18next.t("添加新参数"),
                                width: "60%",
                                content: (
                                    <>
                                        <CreateYakScriptParamForm
                                            onCreated={(param) => {
                                                let flag = false
                                                const paramArr = (params.Params || []).map((item) => {
                                                    if (item.Field === param.Field) {
                                                        flag = true
                                                        info(
                                                            i18next.t("参数") + ` [${param.Field}]${
                                                                param.FieldVerbose ? `(${param.FieldVerbose})` : ""
                                                            } ` + i18next.t("已经存在，已覆盖旧参数")
                                                        )
                                                        return param
                                                    }
                                                    return item
                                                })
                                                if (!flag) paramArr.push(param)
                                                setParams({...params, Params: [...paramArr]})
                                                m.destroy()
                                            }}
                                        />
                                    </>
                                )
                            })
                        }}
                        disabled={disabled}
                    >{i18next.t("添加 / 设置一个参数")} <PlusOutlined />
                    </Button>
                </Form.Item>
            )}
            {params.Params.length > 0 ? (
                <Form.Item label={" "} colon={false}>
                    <List
                        size={"small"}
                        bordered={true}
                        pagination={false}
                        renderItem={(p) => {
                            return (
                                <List.Item key={p.Field}>
                                    <Space size={1}>
                                        {p.Required && <div className='form-item-required-title'>*</div>}
                                        {i18next.t("参数名：")}
                                    </Space>
                                    <Tag color={"geekblue"}>
                                        {p.FieldVerbose && `${p.FieldVerbose} / `}
                                        {p.Field}
                                    </Tag>{i18next.t("类型：")}
                                    <Tag color={"blue"}>
                                        {p.TypeVerbose} {p.DefaultValue && i18next.t(`默认值`) + `：${p.DefaultValue}`}
                                    </Tag>
                                    {p.DefaultValue && i18next.t(`默认值为`) + `: ${p.DefaultValue}`}
                                    {(!isNucleiPoC && (
                                        <Space style={{marginLeft: 20}}>
                                            <Button
                                                size={"small"}
                                                onClick={() => {
                                                    let m = showModal({
                                                        title: i18next.t("修改已知参数: ${p.FieldVerbose}(${p.Field})", { v1: p.FieldVerbose, v2: p.Field }),
                                                        width: "60%",
                                                        content: (
                                                            <>
                                                                <CreateYakScriptParamForm
                                                                    modifiedParam={p}
                                                                    onCreated={(param) => {
                                                                        setParams({
                                                                            ...params,
                                                                            Params: [
                                                                                ...params.Params.filter(
                                                                                    (i) => i.Field !== param.Field
                                                                                ),
                                                                                param
                                                                            ]
                                                                        })
                                                                        m.destroy()
                                                                    }}
                                                                />
                                                            </>
                                                        )
                                                    })
                                                }}
                                                disabled={disabled}
                                            >{i18next.t("修改参数")}
                                            </Button>
                                            <Popconfirm
                                                title={i18next.t("确认要删除该参数吗？")}
                                                onConfirm={(e) => {
                                                    if (setParamsLoading) setParamsLoading(true)
                                                    setParams({
                                                        ...params,
                                                        Params: params.Params.filter((i) => i.Field !== p.Field)
                                                    })
                                                }}
                                            >
                                                <Button size={"small"} type={"link"} danger={true} disabled={disabled}>{i18next.t("删除参数")}
                                                </Button>
                                            </Popconfirm>
                                        </Space>
                                    )) ||
                                        "--"}
                                </List.Item>
                            )
                        }}
                        dataSource={params.Params}
                    ></List>
                </Form.Item>
            ) : (
                ""
            )}
            {params.Type === "yak" && (
                <>
                    <SwitchItem
                        label={i18next.t("启用插件联动 UI")}
                        value={params.EnablePluginSelector}
                        setValue={(EnablePluginSelector) => setParams({...params, EnablePluginSelector})}
                        disabled={disabled}
                    />
                    <SwitchItem
                        label={i18next.t("用于自定义 DNSLOG")}
                        value={params.Tags && params.Tags.includes("custom-dnslog-platform") ? true : false}
                        setValue={(enalbed) => {
                            let obj = {
                                ...params, 
                                Tags: enalbed? addTag(params.Tags === "null"?"":params.Tags, "custom-dnslog-platform"): removeTag(params.Tags, "custom-dnslog-platform"),
                                Content:defParams.Content
                            }
                            if(enalbed){obj.Content = CustomDnsLogPlatformTemplate}
                            setParams(obj)
                        }}
                        disabled={disabled}
                    />
                    {params.EnablePluginSelector && (
                        <ManyMultiSelectForString
                            label={i18next.t("联动插件类型")}
                            value={params.PluginSelectorTypes}
                            data={["mitm", "port-scan"].map((i) => {
                                return {value: i, label: getPluginTypeVerbose(i)}
                            })}
                            mode={"multiple"}
                            setValue={(res) => {
                                setParams({...params, PluginSelectorTypes: res})
                            }}
                            help={i18next.t("通过 cli.String(`yakit-plugin-file`) 获取用户选择的插件")}
                            disabled={disabled}
                        />
                    )}
                </>
            )}
             {params.Type === "codec" && (
                <>
                    <SwitchItem
                        label={i18next.t("用于自定义HTTP数据包变形")}
                        value={  
                            params.Tags && params.Tags.includes("allow-custom-http-packet-mutate") ? true : false
                        }
                        setValue={(enalbed) => setParams({...params, Tags: enalbed? addTag(params.Tags === "null"?"":params.Tags, "allow-custom-http-packet-mutate"): removeTag(params.Tags, "allow-custom-http-packet-mutate")})}
                        disabled={disabled}
                    />
                </>
            )}
        </>
    )
}

export interface CreateYakScriptParamFormProp {
    modifiedParam?: YakParamProps
    onCreated: (params: YakParamProps) => any
}

export const CreateYakScriptParamForm: React.FC<CreateYakScriptParamFormProp> = (props) => {
    const [params, setParams] = useState<YakParamProps>(
        props.modifiedParam || {
            DefaultValue: "",
            Field: "",
            FieldVerbose: "",
            Help: "",
            TypeVerbose: ""
        }
    )
    const [extraSetting, setExtraSetting] = useState<{[key: string]: any}>(
        props.modifiedParam?.ExtraSetting ? JSON.parse(props.modifiedParam.ExtraSetting) : {}
    )
    // 选择类型时的转换
    const typeChange = useMemoizedFn((type: string) => {
        switch (type) {
            case "select":
                setExtraSetting({
                    double: false,
                    data: []
                })
                break
            case "upload-path":
                setExtraSetting({isTextArea: false})
                break
            default:
                setExtraSetting({})
                break
        }
        setParams({...params, TypeVerbose: type, DefaultValue: ""})
    })
    // 提交参数信息的验证
    const verify = useMemoizedFn(() => {
        const type = params.TypeVerbose
        switch (type) {
            case "select":
                if (extraSetting.data.length === 0) {
                    failed(i18next.t("下拉框类型时，请最少添加一个选项数据"))
                    return false
                }
                return true
            default:
                return true
        }
    })
    // 提交参数信息的转换
    const convert = useMemoizedFn(() => {
        const type = params.TypeVerbose
        const setting: YakParamProps = cloneDeep(params)
        const extra = cloneDeep(extraSetting)
        const extraStr = JSON.stringify(extraSetting)

        switch (type) {
            case "select":
                const dataObj = {}
                extra.data.map((item) => {
                    if (item.value in dataObj && item.key) dataObj[item.value] = item.key
                    if (!(item.value in dataObj)) dataObj[item.value] = item.key
                })

                const data: any = []
                for (let item in dataObj) data.push({key: dataObj[item], value: item})
                extra.data = data
                setting.ExtraSetting = JSON.stringify(extra)

                return setting
            case "upload-path":
                extra.isTextArea = setting.Required ? extra.isTextArea : false
                setting.ExtraSetting = JSON.stringify(extra)
                return setting
            default:
                setting.ExtraSetting = extraStr === "{}" ? undefined : extraStr
                return setting
        }
    })

    const updateExtraSetting = useMemoizedFn((type: string, kind: string, key: string, value: any, index?: number) => {
        const extra = cloneDeep(extraSetting)
        switch (type) {
            case "select":
                if (Array.isArray(extra.data) && kind === "update" && index !== undefined) {
                    extra.data[index][key] = value
                    setExtraSetting({...extra})
                }
                if (Array.isArray(extra.data) && kind === "del" && index !== undefined) {
                    extra.data.splice(index, 1)
                    setExtraSetting({...extra})
                }
                return
            default:
                return
        }
    })

    const selectOptSetting = (item: {key: string; value: string}, index: number) => {
        return (
            <div key={index} className='select-type-opt'>
                <span className='opt-hint-title'>{i18next.t("选项名称")}</span>
                <Input
                    className='opt-hint-input'
                    size='small'
                    value={item.key}
                    onChange={(e) => updateExtraSetting("select", "update", "key", e.target.value, index)}
                />
                <span className='opt-hint-title'>
                    <span className='form-item-required-title'>*</span>{i18next.t("选项值")}
                </span>
                <Input
                    className='opt-hint-input'
                    required
                    size='small'
                    value={item.value}
                    placeholder={i18next.t("必填项")}
                    onChange={(e) => updateExtraSetting("select", "update", "value", e.target.value, index)}
                />
                <Button
                    type='link'
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => updateExtraSetting("select", "del", "", "", index)}
                />
            </div>
        )
    }

    const extraSettingComponent = useMemoizedFn((type: string) => {
        switch (type) {
            case "select":
                return (
                    <div>
                        <SwitchItem
                            label={i18next.t("是否支持多选")}
                            setValue={(value) => setExtraSetting({...extraSetting, double: value})}
                            value={!!extraSetting.double}
                            help={i18next.t("多选状态时，用户选中数据保存格式为数组类型")}
                        />
                        <Form.Item label={i18next.t("下拉框选项数据")} className='creator-form-item-margin'>
                            <Button
                                type='link'
                                onClick={() => {
                                    ;(extraSetting.data || []).push({key: "", value: ""})
                                    setExtraSetting({...extraSetting})
                                }}
                            >{i18next.t("新增选项")} <PlusOutlined />
                            </Button>
                        </Form.Item>
                        <Form.Item label={" "} colon={false} className='creator-form-item-margin'>
                            {(extraSetting.data || []).map((item, index) => selectOptSetting(item, index))}
                        </Form.Item>
                    </div>
                )
            case "upload-path":
                if (!params.Required) {
                    return <></>
                }
                return (
                    <div>
                        <SwitchItem
                            label={i18next.t("是否以文本域展示")}
                            setValue={(value) => setExtraSetting({...extraSetting, isTextArea: value})}
                            value={!!extraSetting.isTextArea}
                        />
                    </div>
                )
            default:
                break
        }
    })

    return (
        <>
            <Form
                onSubmitCapture={(e) => {
                    e.preventDefault()

                    if (!verify()) return false
                    props.onCreated(convert())
                }}
                labelCol={{span: 5}}
                wrapperCol={{span: 14}}
            >
                <InputItem
                    disable={!!props.modifiedParam}
                    label={i18next.t("参数名（英文）")}
                    required={true}
                    placeholder={i18next.t("填入想要增加的参数名")}
                    setValue={(Field) => setParams({...params, Field})}
                    value={params.Field}
                    help={i18next.t("参数名应该避免特殊符号，只允许英文 / '-' 等")}
                />
                <InputItem
                    label={i18next.t("参数显示名称(可中文)")}
                    placeholder={i18next.t("输入想要显示的参数名")}
                    setValue={(FieldVerbose) => setParams({...params, FieldVerbose})}
                    value={params.FieldVerbose}
                />
                <SwitchItem
                    label={i18next.t("必要参数")}
                    setValue={(Required) => setParams({...params, Required})}
                    value={params.Required}
                />
                <ManySelectOne
                    label={i18next.t("选择参数类型")}
                    data={[
                        {text: i18next.t("字符串 / string"), value: "string"},
                        {text: i18next.t("布尔值 / boolean"), value: "boolean"},
                        {text: i18next.t("HTTP 数据包 / yak"), value: "http-packet"},
                        {text: i18next.t("Yak 代码块 / yak"), value: "yak"},
                        {text: i18next.t("文本块 / text"), value: "text"},
                        {text: i18next.t("整数（大于零） / uint"), value: "uint"},
                        {text: i18next.t("浮点数 / float"), value: "float"},
                        {text: i18next.t("上传文件路径 / uploadPath"), value: "upload-path"},
                        {text: i18next.t("下拉框 / select"), value: "select"}
                    ]}
                    setValue={(TypeVerbose) => typeChange(TypeVerbose)}
                    value={params.TypeVerbose}
                />
                {!["upload-path", "boolean"].includes(params.TypeVerbose) && (
                    <InputItem
                        label={i18next.t("默认值")}
                        placeholder={i18next.t("该参数的默认值")}
                        setValue={(DefaultValue) => setParams({...params, DefaultValue})}
                        value={params.DefaultValue}
                        help={params.TypeVerbose === "select" ? i18next.t("使用 逗号(,) 作为选项分隔符 ") : undefined}
                    />
                )}
                {["boolean"].includes(params.TypeVerbose) && (
                    <ManySelectOne
                        label={i18next.t("默认值")}
                        placeholder={i18next.t("该参数的默认值")}
                        data={[
                            {text: i18next.t("布尔值 / true"), value: "true"},
                            {text: i18next.t("布尔值 / false"), value: "false"}
                        ]}
                        setValue={(value) => {
                            setParams({...params, DefaultValue: value})
                        }}
                        value={params.DefaultValue}
                    />
                )}
                {extraSettingComponent(params.TypeVerbose)}

                <InputItem
                    label={i18next.t("参数帮助信息")}
                    setValue={(Help) => setParams({...params, Help})}
                    value={params.Help}
                    textarea={true}
                    textareaRow={4}
                    placeholder={i18next.t("填写该参数的帮助信息，帮助用户更容易理解该内容")}
                />
                {!params.Required && (
                    <InputItem
                        label={i18next.t("参数组")}
                        setValue={(Group) => setParams({...params, Group})}
                        value={params.Group}
                        placeholder={i18next.t("参数组，在用户输入界面将会把参数分成组，一般用于设置可选参数`")}
                    />
                )}
                <Form.Item colon={false} label={" "}>
                    <Button type='primary' htmlType='submit'>
                        {" "}
                        {i18next.t("添加参数")}{" "}
                    </Button>
                </Form.Item>
            </Form>
        </>
    )
}

export interface YakScriptLargeEditorProp {
    language?: string
    script: YakScript
    onUpdate: (data: YakScript) => any
    onExit: (data: YakScript) => any
}

export const YakScriptLargeEditor: React.FC<YakScriptLargeEditorProp> = (props) => {
    const {script} = props
    const [params, setParams] = useState<YakScript>({...script})

    useEffect(() => {
        setParams({...script})
    }, [props.script])

    return (
        <>
            <YakCodeEditor
                originValue={Buffer.from(script.Content, "utf8")}
                noTitle={true}
                noHex={true}
                onChange={(value) => setParams({...params, Content: new Buffer(value).toString("utf8")})}
                language={props.language || "yak"}
                noHeader={false}
                disableFullscreen={true}
                noPacketModifier={true}
                extra={
                    <Space style={{marginRight: 10}}>
                        <Button
                            danger={true}
                            onClick={() => {
                                // m.destroy()
                                // setFullscreen(false)
                                ipcRenderer
                                    .invoke("SaveYakScript", params)
                                    .then((data) => {
                                        info(i18next.t("创建 / 保存 Yak 脚本成功"))
                                        props.onUpdate(data)
                                        // setModified(data)
                                    })
                                    .catch((e: any) => {
                                        failed(i18next.t("保存 Yak 模块失败: ${e}", { v1: e }))
                                    })
                                    .finally(() => {
                                        props.onExit(params)
                                    })
                            }}
                        >{i18next.t("退出编辑界面")}
                        </Button>
                        <Button
                            type={"primary"}
                            disabled={[
                                // "mitm",
                                ""
                            ].includes(params.Type)}
                            onClick={() => {
                                ipcRenderer
                                    .invoke("SaveYakScript", params)
                                    .then((data: YakScript) => {
                                        info(i18next.t("创建 / 保存 Yak 脚本成功"))
                                        props.onUpdate(data)
                                        executeYakScriptByParams(data)
                                    })
                                    .catch((e: any) => {
                                        failed(i18next.t("保存 Yak 模块失败: ${e}", { v1: e }))
                                    })
                                    .finally(() => {
                                        // setTimeout(() => setLoading(false), 400)
                                    })
                            }}
                        >
                            {" "}
                            {i18next.t("调试：创建(修改)并立即执行")}{" "}
                        </Button>
                    </Space>
                }
            />
            {/*<Card title={`ScriptName: ${params.ScriptName}`} extra={[*/}
            {/*    <Space>*/}

            {/*    </Space>*/}
            {/*]} bodyStyle={{padding: 0}}>*/}
            {/*    <div style={{*/}
            {/*        width: "100%",*/}
            {/*        height: 1000,*/}
            {/*    }}>*/}
            {/*        <YakEditor*/}
            {/*            type={"yak"}*/}
            {/*            setValue={Content => setParams({...params, Content})}*/}
            {/*            value={params.Content}*/}
            {/*        />*/}
            {/*    </div>*/}
            {/*</Card>*/}
        </>
    )
}
