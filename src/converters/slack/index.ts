import * as fs from 'fs';
import path from 'path';
import { exit } from "process";
import { idgenerator } from "../../utils/utils";
import { NodeType, TanaIntermediateAttribute, TanaIntermediateFile, TanaIntermediateNode, TanaIntermediateSummary, TanaIntermediateSupertag } from "../../types/types";

export function run() {
    const sourceDir = process.argv[2];
    const file = process.argv[3];
    const tanaIntermediteFile = new SlackConverter().convert(sourceDir);

    if (!tanaIntermediteFile) {
        console.log('No nodes found');
        exit(0);
    }

    console.dir(tanaIntermediteFile.summary);

    saveFile(file, tanaIntermediteFile);

}

export class SlackConverter {
    private summary: TanaIntermediateSummary = {
        leafNodes: 0,
        topLevelNodes: 0,
        totalNodes: 0,
        calendarNodes: 0,
        fields: 0,
        brokenRefs: 0,
    };


    public convert(directory: string): TanaIntermediateFile {
        console.log("CONVERT", directory);
        const rootLevelNodes: TanaIntermediateNode[] = [];

        const users = this.slackUsers(path.join(directory, "users.json"));

        if (users) {
            rootLevelNodes.push(users);
        }
        // const channels = this.slackChannels();
        // const messages = this.slackMessages();
        // TODO supertags: #slack-user, #slack-channel, #slack-message
        // TODO attributes

        const supertags: TanaIntermediateSupertag[] = [
            {
                uid: "slack-user-uid",
                name: "slack-user",
            },
            {
                uid: "slack-message-uid",
                name: "slack-message",
            },
            {
                uid: "slack-channel-uid",
                name: "slack-channel",
            },
        ];

        const file: TanaIntermediateFile = {
            version: 'TanaIntermediateFile V0.1',
            summary: this.summary,
            nodes: rootLevelNodes,
            supertags: supertags,
            attributes: [
                {
                    name: "UserName",
                    values: [],
                    count: 1,
                },
                {
                    name: "tz",
                    values: [],
                    count: 1,
                },
                {
                    name: "tz_label",
                    values: [],
                    count: 1,
                },
                {
                    name: "tz_offset",
                    values: [],
                    count: 1,
                },
                {
                    name: "deleted",
                    values: [],
                    count: 1,
                }
            ],
        };

        return file;
    }

    private slackUsers(file: string): TanaIntermediateNode {
        const createdChildNodes: TanaIntermediateNode[] = [];
        this.summary.topLevelNodes += 1;

        const fileContent = fs.readFileSync(file, 'utf8');
        const nodes: SlackUser[] = JSON.parse(fileContent);

        for (let i = 0; i < nodes.length; i++) {
            const user = this.readSlackUser(nodes[i]);
            if (user) {
                createdChildNodes.push(user);
                this.summary.leafNodes += 1;
                this.summary.totalNodes += 1;
                this.summary.fields += 5;
            }
        }

        const usersNode: TanaIntermediateNode = {
            uid: "usersUid",
            name: "Users",
            children: createdChildNodes,
            createdAt: new Date().getTime(),
            editedAt: new Date().getTime(),
            type: "node",
        };

        return usersNode;
    }

    private readSlackUser(slackUser: SlackUser): TanaIntermediateNode {
        const userNode: TanaIntermediateNode = {
            uid: slackUser.id,
            name: slackUser.real_name.slice(0, 3),
            children: [
                createField("UserName", slackUser.name.slice(0, 3)),
                createField("tz", slackUser.tz),
                createField("tz_label", slackUser.tz_label),
                createField("tz_offset", slackUser.tz_offset.toString()),
                createField("deleted", slackUser.deleted.toString()),
            ],
            createdAt: new Date().getTime(),
            editedAt: new Date().getTime(),
            supertags: ["slack-user-uid"],
            type: "node",
        };
        return userNode;
    }
}

type SlackUser = {
    id: string;
    name: string;
    real_name: string;
    tz: string;
    tz_label: string;
    tz_offset: number;
    deleted: boolean;
    image_original: string;
}

function saveFile(fileName: string, tanaIntermediteNodes: TanaIntermediateFile) {
    const targetFileName = `${fileName}.tif.json`;
    fs.writeFileSync(targetFileName, JSON.stringify(tanaIntermediteNodes, null, 2));
    console.log(`Tana Intermediate Nodes written to : ${targetFileName}`);
}


export function createField(name: string, value: string): TanaIntermediateNode {
    return {
        ...createNodeOfType('field', name),
        children: [
            createNodeOfType('node', value),
        ]
    }
}

export function createNode(name: string): TanaIntermediateNode {
    return createNodeOfType('node', name);
}

export function createNodeOfType(type: NodeType, name: string): TanaIntermediateNode {
    return {
        name: name,
        createdAt: new Date().getTime(),
        editedAt: new Date().getTime(),
        type: type,
        uid: idgenerator(),
        children: [],
        refs: [],
        supertags: []
    };
}

run();