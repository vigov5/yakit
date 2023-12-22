import React, {useEffect, useState} from "react";
import {Modal, PageHeader, Space, Tabs} from "antd";
import {showModal} from "../../utils/showModal";
import {CreateShellReceiverForm} from "./CreateShellReceiver";
import {failed, info, success} from "../../utils/notification";
import {ShellItem} from "./ShellItem";
import { AutoSpin } from "../../components/AutoSpin";
import i18next from "../../i18n"

import "./ShellReceiverPage.css"

export interface ShellReceiverPageProp {

}

const {ipcRenderer} = window.require("electron");

export const ShellReceiverPage: React.FC<ShellReceiverPageProp> = (props) => {
    const [addrs, setAddrs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [updatingAddrs, setUpdatingAddrs] = useState(true);
    
    const waitingSyncAddr = () => {
        setUpdatingAddrs(true)
    };
    const removeListenPort = (addr: string) => {
        waitingSyncAddr()
        ipcRenderer.invoke("listening-port-cancel", addr)
    }
    const startListenPort = (addr: string) => {
        if (!addr.includes(":")) {
            failed(i18next.t("无法启动端口监听程序，端口格式不合理: [${addr}]", { v1: addr }))
            return
        }

        const result = addr.split(":", 2);
        const host = result[0];
        const port = result[1];
        if (!host || !port) {
            failed(i18next.t("无法解析主机/端口"))
            return;
        }

        if (addrs.includes(addr)) {
            Modal.error({ title: i18next.t("该地址已经被占用: ") + addr})
            failed(i18next.t("该地址已经被占用: ") + addr)
            return;
        }

        setLoading(true)
        setTimeout(() => {
            ipcRenderer.invoke("listening-port", host, port).then(() => {
                success(i18next.t("监听端口成功"))
            }).catch((e: any) => {
                failed(`ERROR: ${JSON.stringify(e)}`)
            }).finally(() => {
                waitingSyncAddr()
                setTimeout(() => setLoading(false), 300)
            })
        }, 500)
    };

    useEffect(() => {
        const id = setInterval(() => {
            ipcRenderer.invoke("listening-port-query-addrs").then(r => {
                setAddrs(r)
            }).finally(() => {
                if (updatingAddrs) {
                    setUpdatingAddrs(false)
                }
            })
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [])


    const createForm = () => {
        const m = showModal({
            title: i18next.t("开始监听一个 Yak 所属服务器的端口"),
            width: "50%",
            content: <>
                <CreateShellReceiverForm onCheck={addr => {
                    return true
                }} onCreated={(addr) => {
                    startListenPort(addr);
                    m.destroy()
                }}/>
            </>
        })
    }

    useEffect(() => {
        const errorKey = "client-listening-port-end";
        ipcRenderer.on(errorKey, (e: any, data: any) => {
            Modal.info({title: i18next.t("端口[${data}]被关闭", { v1: data })})
        })
        return () => {
            ipcRenderer.removeAllListeners(errorKey)
        }
    }, [])

    return <div style={{width: "100%", height: "100%", display: "flex", flexFlow: "column"}}>
        <PageHeader
            title={"Reverse Shell Receiver"}
            subTitle={
                <Space>
                    {/*<Button type={"primary"}>开启端口并监听</Button>*/}
                    <div>{i18next.t("反弹 Shell 接收工具，可以在服务器上开启一个端口，进行监听，并进行交互。")}</div>
                </Space>
            }
        ></PageHeader>

        <div style={{flex: 1,overflowY: "hidden"}}>
            <AutoSpin spinning={loading || updatingAddrs}>
                <Tabs
                    className="tabs-container"
                    tabBarStyle={{marginBottom: 8}}
                    type={"editable-card"}
                    onEdit={(key, action) => {
                        if (action === "add") {
                            createForm()
                        } else if (action === "remove") {
                            removeListenPort(`${key}`)
                        }
                    }}
                >
                    {(addrs || []).length > 0 ? (
                        addrs.map((e) => {
                            return (
                                <Tabs.TabPane key={e} tab={`${e}`} closable={false}>
                                    <ShellItem addr={e} removeListenPort={removeListenPort} />
                                </Tabs.TabPane>
                            )
                        })
                    ) : (
                        <Tabs.TabPane closable={false} key={"empty"} tab={i18next.t("开始监听端口")}>
                            <CreateShellReceiverForm
                                title={i18next.t("开始监听：在服务器上开启一个端口")}
                                onCheck={(addr) => {
                                    return true
                                }}
                                onCreated={(addr) => {
                                    startListenPort(addr)
                                }}
                            />
                        </Tabs.TabPane>
                    )}
                </Tabs>
            </AutoSpin>
        </div>
        
    </div>
};