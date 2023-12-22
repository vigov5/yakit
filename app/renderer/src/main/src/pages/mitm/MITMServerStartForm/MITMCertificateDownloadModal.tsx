import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import styles from "./MITMServerStartForm.module.scss"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakEditor} from "@/utils/editors"
import {CaCertData} from "../MITMServerHijacking/MITMServerHijacking"
import {useMemoizedFn} from "ahooks"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import i18next from "../../../i18n"

const {ipcRenderer} = window.require("electron")

interface MITMCertificateDownloadModalProps {
    visible: boolean
    setVisible: (b: boolean) => void
}
const MITMCertificateDownloadModal: React.FC<MITMCertificateDownloadModalProps> = React.memo((props) => {
    const {visible, setVisible} = props
    const [caCerts, setCaCerts] = useState<CaCertData>({
        CaCerts: new Buffer(""),
        LocalFile: ""
    })
    useEffect(() => {
        ipcRenderer.invoke("DownloadMITMCert", {}).then((data: CaCertData) => {
            setCaCerts(data)
        })
    }, [])
    /**
     * @description 下载证书
     */
    const onDown = useMemoizedFn(() => {
        if (!caCerts.CaCerts) return
        saveABSFileToOpen(i18next.t("yakit证书.crt.pem"), caCerts.CaCerts)
    })
    return (
        <YakitModal
            visible={visible}
            onCancel={() => setVisible(false)}
            closable={true}
            title={i18next.t("下载 SSL/TLS 证书以劫持 HTTPS")}
            width={720}
            className={styles["mitm-certificate-download-modal"]}
            okText={i18next.t("下载到本地并打开")}
            footerExtra={
                <div className={styles["certificate-download-modal-footer"]}>{i18next.t("在设置代理后访问：")}
                    <YakitTag
                        enableCopy
                        copyText='http://mitm'
                        iconColor='var(--yakit-primary-5)'
                    />{i18next.t("可自动下载证书")}
                </div>
            }
            onOk={() => onDown()}
        >
            <div className={styles["certificate-download-modal-body"]}>
                <YakEditor bytes={true} valueBytes={caCerts.CaCerts} />
            </div>
        </YakitModal>
    )
})

export default MITMCertificateDownloadModal
