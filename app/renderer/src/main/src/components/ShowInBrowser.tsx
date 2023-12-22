import React from "react";
import {HTTPFlow} from "@/components/HTTPFlowTable/HTTPFlowTable";
import {showModal} from "@/utils/showModal";
import {Alert, Button, Space} from "antd";
import {failed} from "@/utils/notification";
import {CopyableField} from "@/utils/inputUtil";
import {openExternalWebsite} from "@/utils/openWebsite";
import i18next from "../i18n"

const {ipcRenderer} = window.require("electron");

export const showResponseViaHTTPFlowID = (v: HTTPFlow) => {
    showResponse(v, undefined, true)
}

export const showResponseViaResponseRaw = (v: Uint8Array, url?: string) => {
    showResponse(v, url, true)
}

const showResponse = (v: HTTPFlow | Uint8Array | string, url?: string, noConfirm?: boolean) => {
    let params: {
        HTTPFlowID?: number
        Url?: string,
        HTTPResponse?: Uint8Array
    } = {
        Url: url,
    };

    try {
        if (typeof v === 'object' && ("Id" in v)) {
            params.HTTPFlowID = (v as HTTPFlow).Id
        } else {
            params.HTTPResponse = v as Uint8Array
        }
    } catch (e) {
        failed(i18next.t("展示 Response 失败，构建参数失败，确保传入 HTTPFlow 或 HTTPResponse Uint8Array"))
        return
    }

    ipcRenderer.invoke("RegisterFacadesHTTP", params).then((res: { FacadesUrl: string }) => {
        if (!!noConfirm) {
            openExternalWebsite(res.FacadesUrl)
            return
        }

        let m = showModal({
            title: i18next.t("确认在浏览器中打开"),
            width: "50%",
            content: (
                <Space direction={"vertical"} style={{maxWidth:"100%"}}>
                    <Alert type={"info"} message={i18next.t("本操作会启用本地架设的高位端口的服务器，设置 Response 来查看页面渲染效果，无需设置代理；")}/>
                    <CopyableField text={res.FacadesUrl} mark={true} />
                    <Button onClick={() => {
                        m.destroy()
                        openExternalWebsite(res.FacadesUrl)
                    }} type={"primary"}>{i18next.t("确认打开")}</Button>
                </Space>
            )
        })
    }).catch(e => {
        failed(i18next.t("展示 Response 失败，${e}", { v1: e }))
    })
}