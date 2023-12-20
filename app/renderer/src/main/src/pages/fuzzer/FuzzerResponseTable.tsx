import React, {useState} from "react";
import {ArtColumn, BaseTable, features, useTablePipeline} from "../../alibaba/ali-react-table-dist";
import {analyzeFuzzerResponse, FuzzerResponse} from "./HTTPFuzzerPage";
import {Button, Space, Table, Tag, Tooltip, Typography} from "antd";
import {formatTimestamp} from "../../utils/timeUtil";
import * as  antd from "antd";
import {DurationMsToColor, StatusCodeToColor} from "../../components/HTTPFlowTable/HTTPFlowTable";
import {divider} from "@uiw/react-md-editor";
import {CopyableField} from "../../utils/inputUtil";
import ReactResizeDetector from "react-resize-detector";
import {useMemoizedFn} from "ahooks";
import i18next from "../../i18n"

export interface FuzzerResponseTableProp {
    content: FuzzerResponse[]
    setRequest: (s: string | any) => any
    success?: boolean
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
    sendToPlugin?: (request: Uint8Array, isHTTPS: boolean, response?: Uint8Array) => any
}

const {Text} = Typography;

// export const FuzzerResponseTable: React.FC<FuzzerResponseTableProp> = React.memo((props) => {
//     const {content, setRequest} = props;
//
//     return <>
//         <Table<FuzzerResponse>
//             size={"small"}
//             scroll={{y: 500, x: 600}}
//             rowKey={"uuid"}
//             bordered={true}
//             columns={[
//                 {
//                     title: "Method",
//                     width: 78,
//                     fixed: "left",
//                     sorter: (a: FuzzerResponse, b: FuzzerResponse) => a.Method.localeCompare(b.Method),
//                     render: (i: FuzzerResponse) => <div>{i.Method}</div>
//                 },
//                 {
//                     title: "访问状态", width: 80,
//                     fixed: "left",
//                     sorter: (a: FuzzerResponse, b: FuzzerResponse) => a.StatusCode - b.StatusCode,
//                     render: (i: FuzzerResponse) => {
//                         return <div>{i.Ok ?
//                             <Tag color={"geekblue"}>{i.StatusCode}</Tag> : <Tooltip title={i.Reason}>
//                                 <Tag color={"red"}>
//                                     失败
//                                 </Tag>
//                             </Tooltip>}</div>
//                     }
//                 },
//                 {
//                     title: "Body 长度", width: 85,
//                     sorter: (a: FuzzerResponse, b: FuzzerResponse) => a.BodyLength - b.BodyLength,
//                     render: (i: FuzzerResponse) => {
//                         return <div>{i.Ok ? i.BodyLength : ""}</div>
//                     }
//                 },
//                 {
//                     title: "延迟(ms)", width: 80,
//                     sorter: (a: FuzzerResponse, b: FuzzerResponse) => a.DurationMs - b.DurationMs,
//                     render: (i: FuzzerResponse) => {
//                         if (!i.Ok) {
//                             return ""
//                         }
//                         return <div>{i.DurationMs &&
//                         <Tag>{i.DurationMs}ms</Tag>}</div>
//                     }
//                 },
//                 {
//                     title: "Content-Type / 失败原因", width: 200,
//                     render: (i: FuzzerResponse) => <Text
//                         ellipsis={{tooltip: true}}
//                         style={{width: 200, color: i.Ok ? undefined : "red"}}
//                     >{i.Ok ? i.ContentType : i.Reason}</Text>
//                 },
//                 {
//                     title: "请求时间", fixed: "right", width: 165,
//                     sorter: (a: FuzzerResponse, b: FuzzerResponse) => a.Timestamp - b.Timestamp,
//                     render: (i: FuzzerResponse) => <Tag>{formatTimestamp(i.Timestamp)}</Tag>
//                 },
//                 {
//                     title: i18next.t("操作"), fixed: "right", width: 80,
//                     render: (i: FuzzerResponse) => <Button
//                         size={"small"} type={"primary"}
//                         onClick={() => {
//                             analyzeFuzzerResponse(i, setRequest)
//                         }}
//                     >分析详情</Button>
//                 },
//             ]}
//             dataSource={content.reverse() || []}
//             pagination={false}
//         />
//     </>
// });

const sortAsNumber = (a: any, b: any) => parseInt(a) > parseInt(b) ? 1 : -1

export const FuzzerResponseTableEx: React.FC<FuzzerResponseTableProp> = React.memo((props) => {
    const {content, setRequest} = props;
    const [tableHeight, setTableHeight] = useState(0);

    const successResponseOperationHandler = useMemoizedFn((v: any, _, index: number) => {
        return <>
            <a onClick={() => {
                const res = content.filter(i => i.UUID === v);
                if ((res || []).length > 0) {
                    analyzeFuzzerResponse(res[0], index, content)
                }
            }}>{i18next.t("详情")}</a>
        </>
    })

    const getArtColumns = useMemoizedFn((): ArtColumn[] => {
        return props.success ? [
            {
                name: i18next.t("请求"), code: "Count", features: {
                    sortable: sortAsNumber,
                },
                width: 70,
            },
            {
                name: "Method", code: "Method", width: 100, features: {
                    sortable: true,
                }
            },
            {
                name: "StatusCode", code: "StatusCode", features: {
                    sortable: sortAsNumber,
                },
                render: v => <div style={{color: StatusCodeToColor(v)}}>{`${v}`}</div>, width: 100,
            },
            {
                name: i18next.t("响应大小"),
                code: "BodyLength",
                render: v => v,
                features: {
                    sortable: sortAsNumber,
                },
                width: 100,
            },
            {
                name: i18next.t("响应相似度"),
                code: "BodySimilarity",
                render: v => {
                    const text = parseFloat(`${v}`).toFixed(3);
                    return <div style={{color: text.startsWith("1.00") ? "green" : undefined}}>{text}</div>

                },
                features: {
                    sortable: sortAsNumber,
                },
                width: 100,
            },
            {
                name: i18next.t("HTTP头相似度"),
                code: "HeaderSimilarity",
                render: v => parseFloat(`${v}`).toFixed(3),
                features: {
                    sortable: sortAsNumber,
                },
                width: 100,
            },
            {
                name: "Payloads",
                code: "Payloads",
                render: (value: any, row: any, rowIndex: number) => {
                    return `${value}`
                    // return <Text ellipsis={{tooltip: true}}>{`${value}`}</Text>
                }, width: 300,
            },
            {
                name: i18next.t("延迟(ms)"),
                code: "DurationMs",
                render: (value: any, row: any, rowIndex: number) => {
                    return value
                }, width: 100,
                features: {
                    sortable: sortAsNumber
                },
            },
            {
                name: "Content-Type",
                code: "ContentType",
                render: (value: any, row: any, rowIndex: number) => {
                    return value
                }, width: 300,
            },
            {
                name: "time", code: "Timestamp", features: {
                    sortable: sortAsNumber,
                },
                render: v => `${formatTimestamp(v)}`, width: 165,
            },
            {
                name: i18next.t("操作"), code: "UUID", render: successResponseOperationHandler,
                width: 80, lock: true,
            }
        ] : [
            {
                name: "Method", code: "Method", width: 60, features: {
                    sortable: true,
                }
            },
            {
                name: i18next.t("失败原因"), code: "Reason", render: (v) => {
                    return v ? <CopyableField style={{color: "red"}} noCopy={true} text={v}/> : "-"
                }, features: {
                    tips: <>{i18next.t("如果请求失败才会有内容~")}
                    </>
                }
            },
            {
                name: "Payloads",
                code: "Payloads",
                render: (value: any, row: any, rowIndex: number) => {
                    return <>{`${value}`}</>
                }, width: 240,
            },
        ]
    })

    const pipeline = useTablePipeline({
        components: antd, primaryKey: (raw: FuzzerResponse) => {
            return raw.UUID
        }
    }).input({
        dataSource: content,
        columns: getArtColumns(),
    }).primaryKey("UUID").use(features.columnResize({
        minSize: 60,
    })).use(
        features.sort({
            mode: 'single',
            highlightColumnWhenActive: true,
        }),
    ).use(features.columnHover()).use(features.tips())

    return <div style={{width: "100%", height: "100%", overflow: "hidden"}}>
        <ReactResizeDetector
            onResize={(width, height) => {
                if (!width || !height) {
                    return
                }
                setTableHeight(height)
            }}
            handleWidth={true} handleHeight={true} refreshMode={"debounce"} refreshRate={50}
        />
        <BaseTable {...pipeline.getProps()} style={{width: "100%", height: tableHeight, overflow: "auto"}}/>
    </div>
});
