import React, {useState} from "react"
import {Form, Space, Table, Tag, Button, Alert} from "antd"
import {CopyableField, ManyMultiSelectForString, SwitchItem} from "../../utils/inputUtil"
import {AutoSpin} from "../../components/AutoSpin"
import i18next from "../../i18n"

export interface ReverseNotification {
    uuid: string
    type: string
    remote_addr: string
    raw?: Uint8Array
    token?: string
    response_info?: string
    connect_hash: string
    timestamp?: number
}
export interface ReverseNotificationTableProps {
    getInfo: any
    clearHandle: () => any
    loading: boolean
    logs: ReverseNotification[]
}

export const ReverseNotificationTable = React.memo<ReverseNotificationTableProps>(
    (props: ReverseNotificationTableProps) => {
        let logs = props.logs
        const [withToken, setWithToken] = useState(false)
        const [type, setType] = useState<"rmi" | "rmi-handshake" | "tcp" | "http" | "https" | "ldap_flag" | string>("")

        if (withToken) {
            logs = logs.filter((i) => !!i.token)
        }

        if (!!type) {
            const types = type.split(",")
            logs = logs.filter((i) => types.includes(i.type))
        }

        return (
            <>
                {props.loading ? (
                    <>
                        <Space style={{float: "left", margin: "1rem", fontSize: "18px"}}>{i18next.t("反连列表")}</Space>
                        <Space style={{float: "right", margin: "1rem"}}>
                            <AutoSpin spinning={props.loading} size={"small"} />
                            <div>
                                <Form onSubmitCapture={(e) => e.preventDefault()} layout={"inline"}>
                                    <SwitchItem
                                        size={"small"}
                                        label={i18next.t("只看Token")}
                                        value={withToken}
                                        setValue={setWithToken}
                                        formItemStyle={{marginBottom: 0}}
                                    />

                                    <ManyMultiSelectForString
                                        label={i18next.t("类型")}
                                        value={type}
                                        setValue={(e) => {
                                            setWithToken(false)
                                            setType(e)
                                        }}
                                        formItemStyle={{marginBottom: 0, minWidth: 200}}
                                        data={[
                                            {value: "rmi", label: i18next.t("RMI连接")},
                                            {value: "rmi-handshake", label: i18next.t("RMI握手")},
                                            {value: "http", label: "HTTP"},
                                            {value: "https", label: "HTTPS"},
                                            {value: "tcp", label: "TCP"},
                                            {value: "tls", label: "TLS"},
                                            {value: "ldap_flag", label: "LDAP"}
                                        ]}
                                    />
                                    <Form.Item name='clear'>
                                        <Button
                                            onClick={() => {
                                                props.clearHandle()
                                            }}
                                        >{i18next.t("清空")}
                                        </Button>
                                    </Form.Item>
                                </Form>
                            </div>
                        </Space>
                    </>
                ) : (
                    ""
                )}

                <Table<ReverseNotification>
                    dataSource={logs}
                    bordered={true}
                    size='large'
                    rowKey={(i) => i.uuid}
                    columns={[
                        {
                            title: i18next.t("反连类型"),
                            render: (i: ReverseNotification) => {
                                switch (i.type) {
                                    case "rmi":
                                        return <Tag color={"red"}>{i18next.t("RMI连接")}</Tag>
                                    case "rmi-handshake":
                                        return <Tag color={"orange"}>{i18next.t("RMI握手")}</Tag>
                                    case "http":
                                        return <Tag color={"red"}>HTTP</Tag>
                                    case "https":
                                        return <Tag color={"red"}>HTTPS</Tag>
                                    case "tls":
                                        return <Tag color={"orange"}>TLS</Tag>
                                    case "tcp":
                                        return <Tag color={"green"}>TCP</Tag>
                                    case "ldap_flag":
                                        return <Tag color={"geekblue"}>LDAP</Tag>
                                    default:
                                        return <Tag color={"geekblue"}>{i.type}</Tag>
                                }
                            }
                        },
                        {
                            title: i18next.t("连接来源"),
                            render: (i: ReverseNotification) => (
                                <CopyableField text={i.remote_addr} noCopy={!i.remote_addr} />
                            )
                        },
                        {
                            title: "TOKEN",
                            render: (i: ReverseNotification) => <CopyableField text={i.token} noCopy={!i.token} />
                        },
                        {
                            title: i18next.t("响应"),
                            render: (i: ReverseNotification) => <Space>{i.response_info}</Space>
                        }
                    ]}
                ></Table>
            </>
        )
    }
)
