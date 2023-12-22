import React,{ReactNode} from "react"
import {Upload} from "antd"
import {
    ItemDraggerInput,
    ItemDraggerInputProps,
    ItemDraggerTextArea,
    ItemDraggerTextAreaProps
} from "../baseTemplate/FormItemUtil"

import "./ContentUploadTextArea.css"
import i18next from "../../i18n"

export interface ContentUploadInputProps extends ItemDraggerTextAreaProps, ItemDraggerInputProps {
    type?: "input" | "textarea"
    beforeUpload?: (f: any) => any
    otherHelpNode?:ReactNode
    uploadHelpText?:string
}

export const ContentUploadInput: React.FC<ContentUploadInputProps> = (props) => {
    const {type = "input", beforeUpload, dragger, item, textarea, input,otherHelpNode,uploadHelpText, ...restProps} = props

    if (type === "input") {
        return (
            <ItemDraggerInput
                dragger={{multiple: false, maxCount: 1, showUploadList: false, beforeUpload, ...dragger}}
                item={{
                    help: (
                        <div className='content-upload-input-help'>
                            {uploadHelpText||i18next.t("可将TXT文件拖入框内或")}
                            <Upload
                                // accept={"text/plain"}
                                multiple={false}
                                maxCount={1}
                                showUploadList={false}
                                beforeUpload={(f) => {
                                    if (beforeUpload) return beforeUpload(f)
                                    else return false
                                }}
                                {...dragger}
                            >
                                <span className='help-hint-title'>{i18next.t("点击此处")}</span>
                            </Upload>
                            {i18next.t("上传")}
                            {otherHelpNode}
                        </div>
                    ),
                    ...item
                }}
                input={{...input}}
                {...restProps}
            />
        )
    }
    if (type === "textarea") {
        return (
            <ItemDraggerTextArea
                dragger={{multiple: false, maxCount: 1, showUploadList: false, beforeUpload, ...dragger}}
                item={{
                    help: (
                        <div className='content-upload-input-help'>
                            {uploadHelpText||i18next.t("可将TXT、Excel文件拖入框内或")}
                            &nbsp;
                            <Upload
                                // accept={"text/plain"}
                                multiple={false}
                                maxCount={1}
                                showUploadList={false}
                                beforeUpload={(f) => {
                                    if (beforeUpload) return beforeUpload(f)
                                    else return false
                                }}
                                {...dragger}
                            >
                                <span className='help-hint-title'>{i18next.t("点击此处")}</span>
                            </Upload>
                            &nbsp;
                            {i18next.t("上传")}
                            {otherHelpNode}
                        </div>
                    ),
                    ...item
                }}
                textarea={{...textarea}}
                {...restProps}
            />
        )
    }

    return <></>
}
