import {V1Namespace} from "@kubernetes/client-node";
import {addLabelToMetaData} from "../../lib";
import {formatYmd} from "../../util/helper";


let namespace = request?.object as V1Namespace

//addLabelToMetaData(namespace, "created-by", request.userInfo.username || "unknown")
addLabelToMetaData(namespace, "created-on", formatYmd(new Date()))
addLabelToMetaData(namespace, "appcode", "ISO1234")
addLabelToMetaData(namespace, "name", namespace.metadata?.name!)

mutate(namespace);

