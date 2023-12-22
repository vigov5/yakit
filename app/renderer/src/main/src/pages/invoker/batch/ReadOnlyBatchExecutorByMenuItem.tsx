import React, {useEffect, useState} from "react";
import {info} from "../../../utils/notification";
import {MenuItem} from "../../MainOperator";
import {SimpleQueryYakScriptSchema} from "./QueryYakScriptParam";
import {ResizeBox} from "../../../components/ResizeBox";
import {BatchExecuteByFilter, simpleQueryToFull} from "./BatchExecuteByFilter";
import {SimplePluginList, SimplePluginListFromYakScriptNames} from "../../../components/SimplePluginList";
import {AutoCard} from "../../../components/AutoCard";
import {Empty, Spin} from "antd";
import {randomString} from "../../../utils/randomUtil";
import {TargetRequest} from "./BatchExecutorPage";
import i18next from "../../../i18n"

const {ipcRenderer} = window.require("electron");

export interface ReadOnlyBatchExecutorByRecoverUidProp {
    Uid?: string
    BaseProgress?: number
}

export const ReadOnlyBatchExecutorByRecoverUid: React.FC<ReadOnlyBatchExecutorByRecoverUidProp> = (props: ReadOnlyBatchExecutorByRecoverUidProp) => {
    const [target, setTarget] = useState<string>("");
    const [query, setQuery] = useState<SimpleQueryYakScriptSchema>({
        tags: "struts", include: [], exclude: [], type: "mitm,port-scan,nuclei"
    });
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        setLoading(true)
        ipcRenderer.invoke("GetExecBatchYakScriptUnfinishedTaskByUid", {
            Uid: props.Uid,
        }).then((req: {
            ScriptNames: string[],
            Target: string,
        }) => {
            const {Target, ScriptNames} = req;
            setQuery({include: ScriptNames, type: "mitm,port-scan,nuclei", exclude: [], tags: ""})
            setTarget(Target)
        }).catch(e => {
            console.info(e)
        }).finally(() => setTimeout(() => setLoading(false), 600))
    }, [props.Uid])

    if (!props.Uid) {
        return <Empty description={i18next.t("恢复未完成的批量执行任务需要额外 UID")}>

        </Empty>
    }

    if (loading) {
        return <Spin tip={i18next.t("正在恢复未完成的任务")}/>
    }

    return <AutoCard size={"small"} bordered={false}
                     bodyStyle={{paddingLeft: 0, paddingRight: 0, paddingTop: 4, overflow: "hidden"}}>
        <ResizeBox
            firstNode={
                <div style={{height: "100%"}}>
                    <SimplePluginListFromYakScriptNames
                        names={query.include}
                    />
                </div>
            }
            firstMinSize={300}
            firstRatio={"300px"}
            secondNode={<BatchExecuteByFilter
                simpleQuery={query}
                allTag={[]}
                total={query.include.length}
                initTargetRequest={{
                    target: target, targetFile: "", allowFuzz: true,
                    progressTaskCount: 5, concurrent: 3, proxy: "",
                    totalTimeout: 7200,
                }}
                isAll={false}
                fromRecover={true}
                recoverUid={props.Uid}
                baseProgress={props.BaseProgress}
                executeHistory={(i) => {
                    // if (!setQuery) {
                    //     return
                    // }
                    // setQuery(i.simpleQuery)
                }}
            />}
        />
    </AutoCard>
}

export interface ReadOnlyBatchExecutorByMenuItemProp {
    MenuItemId: number
}

export const ReadOnlyBatchExecutorByMenuItem: React.FC<ReadOnlyBatchExecutorByMenuItemProp> = (props) => {
    const [query, setQuery] = useState<SimpleQueryYakScriptSchema>({
        exclude: [],
        include: [],
        tags: "",
        type: "mitm,port-scan,nuclei"
    });

    useEffect(() => {
        if (props.MenuItemId <= 0) {
            info(i18next.t("加载批量执行脚本失败"))
            return
        }
        ipcRenderer.invoke("GetMenuItemById", {ID: props.MenuItemId}).then((i: MenuItem) => {
            if (i.Query) {
                setQuery(i.Query)
            }
        })
    }, [props.MenuItemId])

    return <ReadOnlyBatchExecutor query={query}/>
};

export interface ReadOnlyBatchExecutorProp {
    query: SimpleQueryYakScriptSchema
    MenuItemId?: any
    initTargetRequest?: TargetRequest
}

export const ReadOnlyBatchExecutor: React.FC<ReadOnlyBatchExecutorProp> = React.memo((props: ReadOnlyBatchExecutorProp) => {
    const [query, setQuery] = useState<SimpleQueryYakScriptSchema>({
        exclude: [],
        include: [],
        tags: "",
        type: "mitm,port-scan,nuclei"
    });

    const fullQuery = simpleQueryToFull(false, query, []);
    useEffect(() => {
        setQuery({...props.query})
    }, [props.query])

    return <AutoCard size={"small"} bordered={false}
                     bodyStyle={{paddingLeft: 0, paddingRight: 0, paddingTop: 4, overflow: "hidden"}}>
        <ResizeBox
            firstNode={
                <div style={{height: "100%"}}>
                    <SimplePluginList
                        verbose={i18next.t("本项包含检测列表")}
                        key={`batch:menu-item:${props.MenuItemId || randomString(20)}`}
                        pluginTypes={query.type}
                        readOnly={true}
                        initialQuery={{
                            ...fullQuery,
                            Pagination: {Limit: 10000, Page: 1, Order: "updated_at", OrderBy: "desc"},
                        }}
                    />
                </div>

            }
            firstMinSize={300}
            firstRatio={"300px"}
            secondNode={<BatchExecuteByFilter
                simpleQuery={query}
                allTag={[]}
                initTargetRequest={props.initTargetRequest}
                isAll={false}
                executeHistory={(i) => {
                    if (!setQuery) {
                        return
                    }
                    setQuery(i.simpleQuery)
                }}
            />}
        />
    </AutoCard>
});