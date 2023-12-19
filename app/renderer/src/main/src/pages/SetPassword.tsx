import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Form, Input, Button} from "antd"
import {warn,failed, success} from "@/utils/notification"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {} from "@ant-design/icons"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {loginOut, refreshToken} from "@/utils/login"
import {UserInfoProps, yakitDynamicStatus} from "@/store"
import i18next from "../i18n"
const {ipcRenderer} = window.require("electron")

export interface SetPasswordProps {
    userInfo:UserInfoProps,
    onCancel:()=>any
}

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 19}
}


const SetPassword: React.FC<SetPasswordProps> = (props) => {
    const [form] = Form.useForm()
    const {userInfo,onCancel} = props
    const {getFieldValue} = form;
    const [loading, setLoading] = useState<boolean>(false)
    const {dynamicStatus} = yakitDynamicStatus()
    const onFinish = useMemoizedFn((values:API.UpUserInfoRequest) => {
        console.log("values",values)
        const {old_pwd,pwd,confirm_pwd} = values
        if(getFieldValue("confirm_pwd")!==getFieldValue("pwd")){
            warn(i18next.t("新密码两次输入内容不匹配，请检查重试"))
        }
        else{
            NetWorkApi<API.UpUserInfoRequest, API.ActionSucceeded>({
                method: "post",
                url: "urm/up/userinfo",
                data: {
                    old_pwd,
                    pwd,
                    confirm_pwd
                }
                })
                .then((result) => {
                    if(result.ok){
                        success(i18next.t("密码修改成功,请重新登录"))
                        onCancel()
                        if(dynamicStatus.isDynamicStatus){
                            ipcRenderer.invoke("lougin-out-dynamic-control",{loginOut:true})
                        }
                        else{
                            loginOut(userInfo)
                            ipcRenderer.invoke("ipc-sign-out")
                        }
                    }
                })
                .catch((err) => {
                    setLoading(false)
                    failed(i18next.t("密码修改失败：") + err)
                })
                .finally(() => {
                })
        }
    })
    // 判断输入内容是否通过
    const judgePass = () => [
        {
            validator: (_, value) => {
                let re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.<>?;:\[\]{}~!@#$%^&*()_+-="])[A-Za-z\d.<>?;:\[\]{}~!@#$%^&*()_+-="]{8,20}/
                if (re.test(value)) {
                    return Promise.resolve()
                } else {
                    return Promise.reject(i18next.t("密码为8-20位，且必须包含大小写字母、数字及特殊字符"))
                }
            }
        }
    ]
    
    return (
        <div>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Form.Item name='old_pwd' label={i18next.t("旧密码")} rules={[{required: true, message: i18next.t("该项为必填")}]}>
                    <Input.Password placeholder={i18next.t("请输入你的旧密码")} allowClear />
                </Form.Item>
                <Form.Item
                    name='pwd'
                    label={i18next.t("新密码")}
                    rules={[{required: true, message: i18next.t("该项为必填")}, ...judgePass()]}
                >
                    <Input.Password placeholder={i18next.t("请输入你的新密码")} allowClear />
                </Form.Item>
                <Form.Item
                    name='confirm_pwd'
                    label={i18next.t("确认密码")}
                    rules={[{required: true, message: i18next.t("该项为必填")}, ...judgePass()]}
                >
                    <Input.Password placeholder={i18next.t("请确认你的密码")} allowClear />
                </Form.Item>
                <div style={{textAlign: "center"}}>
                    <Button type='primary' htmlType='submit' loading={loading}>{i18next.t("修改密码")}
                    </Button>
                </div>
            </Form>
        </div>
    )
}

export default SetPassword
