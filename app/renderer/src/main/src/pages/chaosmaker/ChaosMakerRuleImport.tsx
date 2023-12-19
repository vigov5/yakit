import React, {useState} from "react";
import {Form, Popconfirm, Space} from "antd";
import {SelectOne} from "@/utils/inputUtil";
import {YakEditor} from "@/utils/editors";
import {AutoCard} from "@/components/AutoCard";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {useMemoizedFn} from "ahooks";
import {failed, info} from "@/utils/notification";
import i18next from "../../i18n"

export interface ChaosMakerRuleImportProp {
    onFinished?: ()=>any
}

export interface ChaosMakerRuleImportParams {
    RuleType: string
    Content: string
}

const {ipcRenderer} = window.require("electron");

export const ChaosMakerRuleImport: React.FC<ChaosMakerRuleImportProp> = (props) => {
    const [params, setParams] = useState<ChaosMakerRuleImportParams>({
        RuleType: "suricata", Content: "",
    });

    const onSubmit = useMemoizedFn(() => {
        if (params.Content === "") {
            failed(i18next.t("规则内容为空"))
            return
        }

        ipcRenderer.invoke("ImportChaosMakerRules", {...params}).then(()=>{
            info(i18next.t("导入成功"))
            if (props.onFinished) {
                props.onFinished()
            }
        })
    })

    return <AutoCard size={"small"} bordered={true} title={i18next.t("导入流量规则")} extra={(
        <Space>
            <Popconfirm
                title={i18next.t("你确认要导入这些规则吗？")}
                onConfirm={()=>{
                    onSubmit()
                }}
            >
                <YakitButton>{i18next.t("导入流量规则")}</YakitButton>
            </Popconfirm>
        </Space>
    )}>
        <Form
            onSubmitCapture={e => {
                e.preventDefault()

                onSubmit()
            }}
            layout={"vertical"}
        >
            <SelectOne label={i18next.t("流量类型")} data={[
                {value: "suricata", text: i18next.t("Suricata 流量规则")},
                {value: "http-request", text: "HTTP"},
                {value: "tcp", text: "TCP"},
                {value: "icmp", text: "ICMP"},
                {value: "linklayer", text: i18next.t("链路层")},
            ]} setValue={RuleType => setParams({...params, RuleType})} value={params.RuleType}/>
            <Form.Item label={i18next.t("规则")} style={{height: "100%"}} required={true}>
                <div style={{height: "300px"}}>
                    <YakEditor
                        type={"html"}
                        setValue={Content => setParams({...params, Content})}
                        value={params.Content}
                        noMiniMap={true}
                    />
                </div>
            </Form.Item>
        </Form>
    </AutoCard>
};