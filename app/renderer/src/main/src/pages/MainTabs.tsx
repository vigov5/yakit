import React, {memo, useEffect, useRef, useState, ReactNode, useLayoutEffect} from "react"
import {Input, Popover, Space, Tabs} from "antd"
import {AutoSpin} from "../components/AutoSpin"
import {DropdownMenu} from "../components/baseTemplate/DropdownMenu"
import {CloseOutlined, EditOutlined} from "@ant-design/icons"
import {isEnpriTraceAgent} from "@/utils/envfile"
import {useGetState} from "ahooks"
import {NoPaddingRoute, YakitRoute} from "@/routes/newRoute"
import i18next from "../i18n"

import "./MainTabs.scss"
import { MultipleNodeInfo } from "./layout/mainOperatorContent/MainOperatorContentType"

const {ipcRenderer} = window.require("electron")
const {TabPane} = Tabs

export interface MainTabsProp {
    currentTabKey: string
    tabType: string
    pages: MultipleNodeInfo[]
    currentKey: string
    isShowAdd?: boolean
    setCurrentKey: (key: string) => void
    removePage: (key: string) => void
    removeOtherPage: (key: string) => void
    onAddTab?: () => any
    updateCacheVerbose: (key: string, value: string) => void
}

interface SimpleDetectTabsProps {
    tabId: string
    status: "run" | "stop" | "success"
}

export const MainTabs: React.FC<MainTabsProp> = memo((props) => {
    const {
        currentTabKey,
        tabType,
        pages,
        currentKey,
        isShowAdd = false,
        setCurrentKey,
        removePage,
        removeOtherPage,
        onAddTab = () => {},
        updateCacheVerbose
    } = props
    const [loading, setLoading] = useState<boolean>(false)
    const tabsRef = useRef(null)
    const [_, setSimpleDetectTabsStatus, getSimpleDetectTabsStatus] = useGetState<SimpleDetectTabsProps[]>([])
    // 渲染展示时聚焦
    useEffect(() => {
        setTimeout(() => {
            if (!tabsRef || !tabsRef.current) return
            const ref = tabsRef.current as unknown as HTMLDivElement
            ref.focus()
        }, 100)
    }, [currentKey])
    // 切换一级页面时聚焦
    useEffect(() => {
        if (currentTabKey === tabType) {
            setTimeout(() => {
                if (!tabsRef || !tabsRef.current) return
                const ref = tabsRef.current as unknown as HTMLDivElement
                ref.focus()
            }, 100)
        }
    }, [currentTabKey])

    const bars = (props: any, TabBarDefault: any) => {
        return (
            <TabBarDefault
                {...props}
                children={(barNode: React.ReactElement) => {
                    if (pages.length === 1) return barNode
                    return (
                        <DropdownMenu
                            menu={{
                                data: [{key: "other", title: i18next.t("关闭其他Tabs")}]
                            }}
                            dropdown={{trigger: ["contextMenu"]}}
                            onClick={(key) => {
                                switch (key) {
                                    case "other":
                                        removeOtherPage(barNode.key as unknown as string)
                                        break
                                    default:
                                        break
                                }
                            }}
                        >
                            {barNode}
                        </DropdownMenu>
                    )
                }}
            />
        )
    }

    return (
        <AutoSpin spinning={loading}>
            <div
                ref={tabsRef}
                className='secondary-menu-tabs'
                tabIndex={0}
                onKeyDown={(e) => {
                    // 快捷键关闭
                    if (e.code === "KeyW" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault()
                        e.stopPropagation()
                        if (pages.length === 0) return

                        setLoading(true)
                        removePage(currentKey)
                        setTimeout(() => {
                            setLoading(false)
                        }, 300)
                        return
                    }
                    // 快捷键新增
                    if (e.code === "KeyT" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!isShowAdd) return
                        onAddTab()
                        return
                    }
                }}
            >
                <Tabs
                    className='secondary-menu-tabs yakit-main-tabs'
                    size='small'
                    type='editable-card'
                    hideAdd={!isShowAdd}
                    activeKey={currentKey}
                    onChange={(key) => setCurrentKey(key)}
                    onEdit={(targetKey, action) => {
                        if (action === "add") onAddTab()
                    }}
                    renderTabBar={(props, TabBarDefault) => {
                        return bars(props, TabBarDefault)
                    }}
                >
                    {pages.map((item, index) => {
                        return (
                            <TabPane
                                forceRender={true}
                                key={item.id}
                                tab={item.verbose}
                                closeIcon={
                                    <Space>
                                        <Popover
                                            trigger={"click"}
                                            title={i18next.t("修改名称")}
                                            content={
                                                <>
                                                    <Input
                                                        size={"small"}
                                                        defaultValue={item.verbose}
                                                        onBlur={(e) => updateCacheVerbose(`${item.id}`, e.target.value)}
                                                    />
                                                </>
                                            }
                                        >
                                            <EditOutlined className='main-container-cion' />
                                        </Popover>
                                        <CloseOutlined
                                            className='main-container-cion'
                                            onClick={() => removePage(`${item.id}`)}
                                        />
                                    </Space>
                                }
                                style={{
                                    padding: NoPaddingRoute.includes(tabType as YakitRoute) ? 0 : "8px 16px 13px 16px"
                                }}
                            >
                                <div
                                    style={{
                                        overflow: "hidden",
                                        height: "100%",
                                        maxHeight: "100%"
                                    }}
                                >
                                    {/* <InitTabId children={item.node} id={item.id} /> */}
                                </div>
                            </TabPane>
                        )
                    })}
                </Tabs>
            </div>
        </AutoSpin>
    )
})
// 通过IPC通信-远程打开一个页面
export const addToTab = (type: string, data?: any) => {
    ipcRenderer.invoke("send-to-tab", {type, data})
}
